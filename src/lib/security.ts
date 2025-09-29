// src/lib/security.ts
import { validateShareRequest, type ShareRequest } from '@/lib/types';
import type { ValidationResult } from '@/lib/types';

// Rate limiting implementation
class RateLimit {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Auto-cleanup on each request to prevent memory leaks
    this.cleanup();

    // Get existing requests for this key
    const requests = this.requests.get(key) || [];

    // Filter out requests outside the current window
    const validRequests = requests.filter(time => time > windowStart);

    // Update the requests array
    this.requests.set(key, validRequests);

    // Check if limit exceeded
    const remaining = Math.max(0, this.limit - validRequests.length);
    const success = validRequests.length < this.limit;

    if (success) {
      // Add current request
      validRequests.push(now);
      this.requests.set(key, validRequests);
    }

    return {
      success,
      limit: this.limit,
      remaining: success ? remaining - 1 : remaining,
      reset: Math.ceil((now + this.windowMs) / 1000),
    };
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Create rate limiter: 10 requests per 15 minutes
export const shareRateLimit = new RateLimit(10, 15 * 60 * 1000);

// Clean up rate limit entries on each request (no memory leak)
// In serverless environments, setInterval creates persistent timers that cause memory leaks

// Secure client IP extraction
export function getClientIP(req: Request): string {
  // Get forwarded IPs and validate them
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');

  // In production, only trust specific proxy headers from known sources
  if (process.env.NODE_ENV === 'production') {
    // For Vercel, x-forwarded-for is trusted
    // For other hosts, you may need to configure this differently
    const trustedIP = forwardedFor?.split(',')[0]?.trim();
    if (trustedIP && isValidIPAddress(trustedIP)) {
      return trustedIP;
    }
  }

  // Development or fallback: try multiple headers
  const possibleIPs = [
    forwardedFor?.split(',')[0]?.trim(),
    realIP,
    req.headers.get('cf-connecting-ip'), // Cloudflare
    req.headers.get('x-client-ip'),
  ].filter(Boolean);

  for (const ip of possibleIPs) {
    if (ip && isValidIPAddress(ip)) {
      return ip;
    }
  }

  return 'anonymous';
}

// Validate IP address format
function isValidIPAddress(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Generate secure UUID
export function generateSecureId(): string {
  return crypto.randomUUID();
}

// Validate request size
export function validateRequestSize(req: Request, maxSize: number): boolean {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10) <= maxSize;
  }
  return true; // If no content-length header, assume it's okay
}

// Validate content type
export function validateContentType(req: Request, expectedType: string): boolean {
  const contentType = req.headers.get('content-type');
  return contentType?.includes(expectedType) || false;
}

// Validate origin for CSRF protection
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origin || !host) {
    return false;
  }

  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }

  // In production, validate against the host
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// Validate and sanitize share request
export function validateAndSanitizeShareRequest(payload: unknown): ValidationResult<ShareRequest> {
  return validateShareRequest(payload);
}

// Security headers
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};