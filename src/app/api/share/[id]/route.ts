import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';

export const runtime = 'edge'; // Upstash works great on Edge
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; // await the params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const data = await kv.get(`share:day:${id}`);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
