import { NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const bodyText = await req.text();

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
    if (!PUBLIC_KEY) {
      console.error('Missing DISCORD_PUBLIC_KEY environment variable');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + bodyText),
      Buffer.from(signature, 'hex'),
      Buffer.from(PUBLIC_KEY, 'hex')
    );

    if (!isVerified) {
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
        // Extract product option (whey, creatine)
        const productOption = body.data.options?.[0]?.value || 'evowhey';
        const userId = body.member?.user?.id || body.user?.id;
        
        if (!userId) {
          return NextResponse.json({ type: 4, data: { content: 'Could not identify your User ID.' } });
        }

        // Add user to the Set of subscribers for this product
        await kv.sadd(`subs:${productOption}`, userId);

        return NextResponse.json({
          type: 4, // 4 = respond with message in channel
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
