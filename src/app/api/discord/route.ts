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
      
      if (commandName === 'subscribe') {
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        const userId = body.member?.user?.id || body.user?.id;
        
        if (!userId) {
          return NextResponse.json({ type: 4, data: { content: 'Could not identify your User ID.' } });
        }

        // Add user to the Set of subscribers for this product
        await redis.sadd(`subs:${productOption}`, userId);

        return NextResponse.json({
          type: 4,
          data: {
            content: `✅ Successfully subscribed! You will be pinged if the price of **${productOption}** drops.`,
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
