import { NextResponse } from 'next/server';
import { redis, ratelimit } from '@/lib/redis';
import { sendDiscordMessage } from '@/lib/discord';
import { scrapeProductPrice } from '@/lib/scraper';

export const maxDuration = 60; // 60 seconds (max for Hobby tier)

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

    // 2. Scrape Price
    const targetUrl = 'https://www.hsnstore.pt/marcas/sport-series/evowhey-protein';
    const currentPrice = await scrapeProductPrice(targetUrl);

    if (!currentPrice) {
      return NextResponse.json({ error: 'Could not extract price data' }, { status: 500 });
    }

    // 3. Database / Logic
    const DB_KEY = 'price:evowhey:2kg';
    const SUBS_KEY = 'subs:evowhey';
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
        const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of Evowhey 2Kg has dropped by **${percentDrop.toFixed(1)}%**!\nPrevious Baseline: ${previousPrice}€\nNew Price: **${currentPrice}€**\n\nBuy now: ${targetUrl}`;
        
        for (const userId of subscribers) {
          await sendDiscordMessage(userId, alertMsg);
        }

        // 4. Update Database
        // Reset baseline to the new low so we don't keep alerting every 12 hours while the sale is active
        await redis.set(DB_KEY, currentPrice);

      } else if (currentPrice > previousPrice) {
        // 4. Update Database
        // Price went back up (sale ended, or base price increased). Establish new high baseline.
        await redis.set(DB_KEY, currentPrice);
      }
      
      // NOTE: If the price dropped slightly (<10%) or stayed exactly the same, 
      // we DO NOTHING to the baseline! This allows small consecutive daily drops 
      // to eventually trigger the >10% threshold.
    }

    return NextResponse.json({
      success: true,
      data: { currentPrice, previousPrice, percentDrop, dropDetected },
      message: `Scrape complete. Current price: ${currentPrice} €`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

