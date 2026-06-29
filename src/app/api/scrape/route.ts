import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl, {
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
    const lines = html.split('\n');
    let currentPrice = 0;

    // Parse logic
    for (let line of lines) {
      if (line.includes('{"attributes":{') && line.includes('content_weight')) {
        line = line.trim();
        const start = line.indexOf('{"attributes":{');
        if (start !== -1) {
          const jsonStr = line.substring(start);
          let count = 0, end = 0;
          for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') count++;
            else if (jsonStr[i] === '}') {
              count--;
              if (count === 0) { end = i + 1; break; }
            }
          }
          if (end > 0) {
            try {
              const data = JSON.parse(jsonStr.substring(0, end));
              const weightAttr = data.attributes['216'];
              const twokgOpt = weightAttr.options.find((opt: any) => opt.label === '2Kg');
              if (twokgOpt) {
                const pid = twokgOpt.products[0];
                currentPrice = data.optionPrices[pid].finalPrice.amount;
              }
            } catch (err) {}
          }
        }
      }
    }

    if (!currentPrice) {
      return NextResponse.json({ error: 'Could not extract price data' }, { status: 500 });
    }

    // KV Logic
    const DB_KEY = 'price:evowhey:2kg';
    const SUBS_KEY = 'subs:evowhey';
    const previousPrice = await kv.get<number>(DB_KEY);

    let dropDetected = false;
    let percentDrop = 0;

    if (previousPrice) {
      const difference = previousPrice - currentPrice;
      percentDrop = (difference / previousPrice) * 100;
      
      // If price drops by more than 10%
      if (percentDrop > 10) {
        dropDetected = true;
        
        // Notify subscribers
        const subscribers = await kv.smembers(SUBS_KEY);
        const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of Evowhey 2Kg has dropped by **${percentDrop.toFixed(1)}%**!\nPrevious: ${previousPrice}€\nNew Price: **${currentPrice}€**\n\nBuy now: ${targetUrl}`;
        
        for (const userId of subscribers) {
          await sendDiscordMessage(userId, alertMsg);
        }
      }
    }

    // Always update the stored price to the latest one
    await kv.set(DB_KEY, currentPrice);

    return NextResponse.json({
      success: true,
      data: { currentPrice, previousPrice, percentDrop, dropDetected },
      message: `Scrape complete. Current price: ${currentPrice} €`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
