// src/app/api/share/[id]/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { CSP_HEADERS } from '@/lib/security';
import { isValidTaskId } from '@/lib/types';
import { shareRateLimit } from '@/lib/security';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx): Promise<NextResponse> {
  const headers = new Headers(CSP_HEADERS);
  headers.set('Cache-Control', 'no-store');

  try {
    const { id } = await params;

    // Validate ID format
    if (!id || !isValidTaskId(id)) {
      return NextResponse.json(
        { error: 'Invalid share ID format', code: 'INVALID_ID' },
        { status: 400, headers }
      );
    }

    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';

    const rateLimitResult = shareRateLimit.check(clientIP);

    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers }
      );
    }

    // Fetch data from KV store
    const data = await kv.get(`share:day:${id}`);

    if (!data) {
      return NextResponse.json(
        { error: 'Share not found', code: 'NOT_FOUND' },
        { status: 404, headers }
      );
    }

    // Remove sensitive metadata before returning
    const { createdBy, ...publicData } = data as any;

    return NextResponse.json(publicData, { headers });
  } catch (error) {
    console.error('Share fetch error:', error);

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    );
  }
}

// Optional: DELETE endpoint for share cleanup
export async function DELETE(req: Request, { params }: Ctx): Promise<NextResponse> {
  const headers = new Headers(CSP_HEADERS);
  headers.set('Cache-Control', 'no-store');

  try {
    const { id } = await params;

    // Validate ID format
    if (!id || !isValidTaskId(id)) {
      return NextResponse.json(
        { error: 'Invalid share ID format', code: 'INVALID_ID' },
        { status: 400, headers }
      );
    }

    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';

    const rateLimitResult = shareRateLimit.check(clientIP);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers }
      );
    }

    // Check if share exists first
    const exists = await kv.get(`share:day:${id}`);
    if (!exists) {
      return NextResponse.json(
        { error: 'Share not found', code: 'NOT_FOUND' },
        { status: 404, headers }
      );
    }

    // Delete the share
    await kv.del(`share:day:${id}`);

    return NextResponse.json({ message: 'Share deleted successfully' }, { status: 200, headers });
  } catch (error) {
    console.error('Share delete error:', error);

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    );
  }
}
