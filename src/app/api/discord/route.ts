import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { redis, discordRatelimit } from '@/lib/redis';
import { sendDiscordMessage } from '@/lib/discord';

import { PRODUCTS } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const bodyText = await req.text();

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';

    const isValid = await verifyKey(bodyText, signature, timestamp, PUBLIC_KEY);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);

    // 1 = PING from Discord
    if (body.type === 1) {
      return NextResponse.json({ type: 1 }); // ACK PONG
    }

    // 2 = Slash Command
    if (body.type === 2) {
      const commandName = body.data.name;
      const userId = body.member?.user?.id || body.user?.id;
      
      if (!userId) {
        return NextResponse.json({ type: 4, data: { content: 'Could not identify your User ID.' } });
      }

      // --- USER RATE LIMIT ---
      const { success } = await discordRatelimit.limit(`discord_limit_${userId}`);
      if (!success) {
        return NextResponse.json({
          type: 4,
          data: { content: `⚠️ Whoa there! You are sending commands too fast. Please wait a minute before trying again.` }
        });
      }
      // -----------------------
      
      if (commandName === 'subscribe') {
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        const productDef = PRODUCTS.find(p => p.id === productOption);
        const niceName = productDef ? productDef.name : productOption;
        
        // Add user to the Set of subscribers for this product
        await redis.sadd(`subs:${productOption}`, userId);

        let responseText = `✅ Successfully subscribed! You will be pinged if the price of **${niceName}** drops.`;

        // Check if there is an ACTIVE sale right now!
        const BASELINE_KEY = `price:${productOption}`;
        const CURRENT_KEY = `current_price:${productOption}`;
        const ALERTED_KEY = `alerted:${productOption}`;

        const [baseline, current] = await Promise.all([
          redis.get<number>(BASELINE_KEY),
          redis.get<number>(CURRENT_KEY)
        ]);

        if (baseline && current) {
          const percentDrop = ((baseline - current) / baseline) * 100;
          
          if (percentDrop >= 10) {
            // Instant Alert!
            const alertMsg = `🚨 **PRICE DROP ALERT!** 🚨\nThe price of **${niceName}** is CURRENTLY dropped by **${percentDrop.toFixed(1)}%**!\nPrevious Baseline: ${baseline.toFixed(2)}€\nNew Price: **${current.toFixed(2)}€**\n\nBuy now!`;
            
            try {
              await sendDiscordMessage(userId, alertMsg);
              // Mark them as alerted so the cron doesn't spam them again
              await redis.sadd(ALERTED_KEY, userId);
              
              responseText = `✅ Successfully subscribed! \n\n👀 **Wait a minute... there is a flash sale active right now!** I just sent you a DM!`;
            } catch (err: any) {
              console.error('Failed to send instant alert:', err.message);
            }
          }
        }

        return NextResponse.json({
          type: 4,
          data: {
            content: responseText,
          }
        });
      }
      
      if (commandName === 'unsubscribe') {
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        const productDef = PRODUCTS.find(p => p.id === productOption);
        const niceName = productDef ? productDef.name : productOption;
        
        await redis.srem(`subs:${productOption}`, userId);

        return NextResponse.json({
          type: 4,
          data: {
            content: `✅ Successfully unsubscribed from **${niceName}** alerts.`,
          }
        });
      }

      if (commandName === 'test') {
        const testMsg = `🚨 **[TEST DRIVE] PRICE DROP ALERT!** 🚨\nThe price of Evowhey 2Kg has dropped by **25.0%**!\nPrevious Baseline: 61.48€\nNew Price: **46.11€**\n\nBuy now: https://www.hsnstore.pt/marcas/sport-series/evowhey-protein`;
        
        try {
          await sendDiscordMessage(userId, testMsg);
          return NextResponse.json({
            type: 4,
            data: { content: `🏎️ Test drive successful! I just sent you a DM!` }
          });
        } catch (error: any) {
          return NextResponse.json({
            type: 4,
            data: { content: `❌ I tried to DM you but Discord blocked me! Error: ${error.message}` }
          });
        }
      }
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


