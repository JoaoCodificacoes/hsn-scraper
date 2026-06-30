import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { extractPriceFromHtml } from '@/lib/parser';

export const maxDuration = 60; // 60 seconds (max for Hobby tier)

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN;

async function sendDiscordMessage(userId: string, content: string) {
  if (!DISCORD_BOT_TOKEN) return;
  
  // 1. Create DM channel
  const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: userId }),
  });
  
  if (!dmRes.ok) {
    console.error('Failed to create DM channel', await dmRes.text());
    return;
  }
  
  const dmChannel = await dmRes.json();
  
  // 2. Send Message
  await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
}

export async function GET() {
  try {
    const targetUrl = 'https://www.hsnstore.pt/marcas/sport-series/evowhey-protein';
    
    // Use ScrapingAnt if the key is provided in Vercel (10,000 free requests/month)
    let fetchUrl = targetUrl;
    if (process.env.SCRAPINGANT_API_KEY) {
      fetchUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(targetUrl)}&x-api-key=${process.env.SCRAPINGANT_API_KEY}`;
    } else if (process.env.SCRAPER_API_KEY) {
      fetchUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
    }
    
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Fetch failed', 
        status: response.status, 
        statusText: response.statusText 
      }, { status: 500 });
    }

    const html = await response.text();
    const currentPrice = extractPriceFromHtml(html);

    if (!currentPrice) {
      return NextResponse.json({ error: 'Could not extract price data' }, { status: 500 });
    }

    // KV Logic
    const DB_KEY = 'price:evowhey:2kg';
    const SUBS_KEY = 'subs:evowhey';
    const previousPrice = await redis.get<number>(DB_KEY);

    let dropDetected = false;
    let percentDrop = 0;

    if (previousPrice) {
      const difference = previousPrice - currentPrice;
      percentDrop = (difference / previousPrice) * 100;
      
      // If price drops by more than 10%
      if (percentDrop > 10) {
        dropDetected = true;
        
        // Notify subscribers
        const subscribers = await redis.smembers(SUBS_KEY);
        const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of Evowhey 2Kg has dropped by **${percentDrop.toFixed(1)}%**!\nPrevious: ${previousPrice}€\nNew Price: **${currentPrice}€**\n\nBuy now: ${targetUrl}`;
        
        for (const userId of subscribers) {
          await sendDiscordMessage(userId, alertMsg);
        }
      }
    }

    // Always update the stored price to the latest one
    await redis.set(DB_KEY, currentPrice);

    return NextResponse.json({
      success: true,
      data: { currentPrice, previousPrice, percentDrop, dropDetected },
      message: `Scrape complete. Current price: ${currentPrice} €`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
