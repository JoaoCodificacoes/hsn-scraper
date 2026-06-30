import { NextResponse } from 'next/server';
import { redis, ratelimit } from '@/lib/redis';
import { sendDiscordMessage } from '@/lib/discord';
import { fetchProxyHtml } from '@/lib/scraper';
import { extractPriceFromHtml } from '@/lib/parser';
import { PRODUCTS } from '@/lib/config';

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

    const results = [];

    // 2. Loop through all products
    for (const product of PRODUCTS) {
      const html = await fetchProxyHtml(product.url);
      const currentPrice = extractPriceFromHtml(html, product.weightLabel);

      if (!currentPrice) {
        console.error(`Could not extract price data for ${product.id}`);
        continue; // Skip this product and try the next one
      }

      // 3. Database / Logic
      const BASELINE_KEY = `price:${product.id}`;
      const CURRENT_KEY = `current_price:${product.id}`;
      const SUBS_KEY = `subs:${product.id}`;
      const ALERTED_KEY = `alerted:${product.id}`;
      
      const previousPrice = await redis.get<number>(BASELINE_KEY);

      let dropDetected = false;
      let percentDrop = 0;
      const timestamp = new Date().toISOString();

      // Always save the absolute latest price so the Discord bot can check it
      await redis.set(CURRENT_KEY, currentPrice);
      
      // Save the historical price point
      await redis.rpush(`history:${product.id}`, JSON.stringify({ price: currentPrice, date: timestamp }));

      if (!previousPrice) {
        // First time running ever, set the initial baseline price
        await redis.set(BASELINE_KEY, currentPrice);
      } else {
        const difference = previousPrice - currentPrice;
        percentDrop = (difference / previousPrice) * 100;
        
        if (percentDrop >= 10) {
          dropDetected = true;
          
          // Get all subscribers who HAVE NOT been alerted yet for this specific sale
          const subscribers = await redis.smembers(SUBS_KEY);
          const alreadyAlerted = await redis.smembers(ALERTED_KEY);
          const unalertedUsers = subscribers.filter(id => !alreadyAlerted.includes(id));
          
          const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of **${product.name}** has dropped by **${percentDrop.toFixed(1)}%**!\nPrevious Baseline: ${previousPrice.toFixed(2)}€\nNew Price: **${currentPrice.toFixed(2)}€**\n\nBuy now: ${product.url}`;
          
          for (const userId of unalertedUsers) {
            await sendDiscordMessage(userId, alertMsg);
            // Mark them as alerted so we don't spam them again during this sale
            await redis.sadd(ALERTED_KEY, userId);
          }

          // NOTE: We DO NOT update the baseline here! We keep the high baseline 
          // so new subscribers can still see the drop relative to the real baseline.

        } else {
          // If percentDrop < 10, the sale is not active (or ended).
          // We MUST clear the alerted list so they are ready for the next real sale!
          await redis.del(ALERTED_KEY);

          if (currentPrice > previousPrice) {
            // Price went back up (sale ended, or base price increased). Establish new high baseline.
            await redis.set(BASELINE_KEY, currentPrice);
          }
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

