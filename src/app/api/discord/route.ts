import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { redis } from '@/lib/redis';

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
      
      if (commandName === 'subscribe') {
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        await redis.sadd(`subs:${productOption}`, userId);

        return NextResponse.json({
          type: 4,
          data: {
            content: `✅ Successfully subscribed! You will be pinged if the price of **${productOption}** drops.`,
          }
        });
      }
      
      if (commandName === 'unsubscribe') {
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        await redis.srem(`subs:${productOption}`, userId);

        return NextResponse.json({
          type: 4,
          data: {
            content: `✅ Successfully unsubscribed from **${productOption}** alerts.`,
          }
        });
      }

      if (commandName === 'test') {
        // Run test drive asynchronously so Discord receives the ACK immediately
        fetch('https://hsn-scraper.vercel.app/api/discord/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }).catch(console.error);

        return NextResponse.json({
          type: 4,
          data: {
            content: `🏎️ Test drive initiated! I am sending you a DM right now...`,
          }
        });
      }
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

