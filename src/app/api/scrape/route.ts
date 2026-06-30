import { NextResponse } from 'next/server';
import { redis, ratelimit } from '@/lib/redis';
import { sendDiscordMessage } from '@/lib/discord';
import { scrapeProductPrice } from '@/lib/scraper';

export const maxDuration = 60; // 60 seconds (max for Hobby tier)

const PRODUCTS = [
  {
    id: 'evowhey',
    name: 'Evowhey 2Kg',
    url: 'https://www.hsnstore.pt/marcas/sport-series/evowhey-protein'
  },
  {
    id: 'creatine',
    name: 'Creatine 1Kg',
    url: 'https://www.hsnstore.pt/marcas/raw-series/creatina-monoidrato-em-po-200-mesh'
  }
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const authHeader = req.headers.get('authorization');
    
    // 1. Authorization & Rate Limiting
    const isCron = process.env.CRON_SECRET && (
      secret === process.env.CRON_SECRET || 
      authHeader === `Bearer ${process.env.CRON_SECRET}`
    );

    // If it's NOT the authorized cron job, apply the strict global rate limit
    if (!isCron) {
      const { success } = await ratelimit.limit('global_scrape_limit');
      if (!success) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Maximum 10 public scrapes per day allowed.' 
        }, { status: 429 });
      }
    }

    const results = [];

    // 2. Loop through all products
    for (const product of PRODUCTS) {
      const currentPrice = await scrapeProductPrice(product.url);

      if (!currentPrice) {
        console.error(`Could not extract price data for ${product.id}`);
        continue; // Skip this product and try the next one
      }

      // 3. Database / Logic
      const DB_KEY = `price:${product.id}`;
      const SUBS_KEY = `subs:${product.id}`;
      const previousPrice = await redis.get<number>(DB_KEY);

      let dropDetected = false;
      let percentDrop = 0;

      if (!previousPrice) {
        // First time running ever, set the initial baseline price
        await redis.set(DB_KEY, currentPrice);
      } else {
        const difference = previousPrice - currentPrice;
        percentDrop = (difference / previousPrice) * 100;
        
        if (percentDrop >= 10) {
          dropDetected = true;
          
          // Notify subscribers
          const subscribers = await redis.smembers(SUBS_KEY);
          const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of **${product.name}** has dropped by **${percentDrop.toFixed(1)}%**!\nPrevious Baseline: ${previousPrice}€\nNew Price: **${currentPrice}€**\n\nBuy now: ${product.url}`;
          
          for (const userId of subscribers) {
            await sendDiscordMessage(userId, alertMsg);
          }

          // Reset baseline to the new low so we don't keep alerting every 12 hours while the sale is active
          await redis.set(DB_KEY, currentPrice);

        } else if (currentPrice > previousPrice) {
          // Price went back up (sale ended, or base price increased). Establish new high baseline.
          await redis.set(DB_KEY, currentPrice);
        }
      }

      results.push({
        id: product.id,
        currentPrice,
        previousPrice,
        percentDrop,
        dropDetected
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Scrape complete. Processed ${results.length} products.`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

