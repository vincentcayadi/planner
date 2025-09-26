import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

export async function POST(req: Request) {
  try {
    const payload = await req.json(); // your day payload (dateKey + items + planner, etc.)

    const id = crypto.randomUUID();
    const key = `share:day:${id}`;

    // Store with TTL
    await kv.set(key, payload, { ex: DEFAULT_TTL_SECONDS });

    // Build an absolute URL for convenience
    const { origin } = new URL(req.url);
    return NextResponse.json({ id, url: `${origin}/share/${id}` }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
