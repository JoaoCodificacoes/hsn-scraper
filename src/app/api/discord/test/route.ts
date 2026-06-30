import { NextResponse } from 'next/server';
import { sendDiscordMessage } from '@/lib/discord';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const testMsg = `🚨 **[TEST DRIVE] PRICE DROP ALERT!** 🚨\nThe price of Evowhey 2Kg has dropped by **25.0%**!\nPrevious Baseline: 61.48€\nNew Price: **46.11€**\n\nBuy now: https://www.hsnstore.pt/marcas/sport-series/evowhey-protein`;

    await sendDiscordMessage(userId, testMsg);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
