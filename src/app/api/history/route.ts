import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const [evowheyRaw, creatineRaw] = await Promise.all([
      redis.lrange('history:evowhey', 0, -1),
      redis.lrange('history:creatine', 0, -1)
    ]);

    // Parse the JSON strings from Redis
    const parseHistory = (rawList: string[]) => {
      if (!rawList) return [];
      // Upstash Redis sometimes parses JSON automatically, sometimes returns strings.
      return rawList.map(item => {
        if (typeof item === 'object') return item;
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }).filter(Boolean);
    };

    const evowheyHistory = parseHistory(evowheyRaw as any);
    const creatineHistory = parseHistory(creatineRaw as any);

    return NextResponse.json({
      success: true,
      data: {
        evowhey: evowheyHistory,
        creatine: creatineHistory
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
