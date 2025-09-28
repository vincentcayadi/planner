// src/app/api/share/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import {
  validateAndSanitizeShareRequest,
  generateSecureId,
  validateOrigin,
  validateRequestSize,
  validateContentType,
  shareRateLimit,
  CSP_HEADERS,
} from '@/lib/security';
import type { ShareResponse } from '@/lib/types';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request): Promise<NextResponse> {
  // Add security headers
  const headers = new Headers(CSP_HEADERS);
  headers.set('Cache-Control', 'no-store');

  try {
    // Validate request size
    if (!validateRequestSize(req, MAX_REQUEST_SIZE)) {
      return NextResponse.json(
        { error: 'Request too large', code: 'REQUEST_TOO_LARGE' },
        { status: 413, headers }
      );
    }

    // Validate content type
    if (!validateContentType(req, 'application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type', code: 'INVALID_CONTENT_TYPE' },
        { status: 400, headers }
      );
    }

    // Validate origin for CSRF protection
    if (process.env.NODE_ENV === 'production' && !validateOrigin(req)) {
      return NextResponse.json(
        { error: 'Invalid origin', code: 'INVALID_ORIGIN' },
        { status: 403, headers }
      );
    }

    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';

    const rateLimitResult = shareRateLimit.check(clientIP);

    // Set rate limit headers
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers }
      );
    }

    // Parse and validate request body
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400, headers }
      );
    }

    // Validate and sanitize the request data
    const validation = validateAndSanitizeShareRequest(payload);
    if (!validation.success) {
      return NextResponse.json('error' in validation ? validation.error : { error: 'Validation failed' }, { status: 400, headers });
    }

    // Generate secure ID
    const id = generateSecureId();
    const key = `share:day:${id}`;

    // Store with TTL and add metadata
    const storeData = {
      ...validation.data,
      createdAt: new Date().toISOString(),
      createdBy: clientIP, // Store hashed in production
      version: 1,
    };

    await kv.set(key, storeData, { ex: DEFAULT_TTL_SECONDS });

    // Build response
    const { origin } = new URL(req.url);
    const response: ShareResponse = {
      id,
      url: `${origin}/share/${id}`,
    };

    return NextResponse.json(response, {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error('Share API error:', error);

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    );
  }
}

