// src/lib/security/index.ts
import { rateLimit } from '@/lib/security/rateLimit';
import { validateShareRequest, type ShareRequest, type ApiResponse } from '@/lib/types';

/**
 * Content Security Policy headers
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.upstash.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
};

/**
 * Input sanitization for HTML content
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL injection prevention (for future database operations)
 */
export function escapeString(input: string): string {
  return input.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
}

/**
 * Validate and sanitize share request data
 */
export function validateAndSanitizeShareRequest(data: unknown): ApiResponse<ShareRequest> {
  const validation = validateShareRequest(data);

  if (!validation.success) {
    return {
      success: false,
      error: {
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: { validationErrors: 'errors' in validation ? validation.errors : [] },
      },
    };
  }

  // Additional security checks
  const { dateKey, items, planner } = validation.data;

  // Check for reasonable limits
  if (items.length > 100) {
    return {
      success: false,
      error: {
        error: 'Too many items',
        code: 'LIMIT_EXCEEDED',
        details: { maxItems: 100 },
      },
    };
  }

  // Sanitize task names and descriptions
  const sanitizedItems = items.map((item) => ({
    ...item,
    name: sanitizeHtml(item.name.trim()),
    description: item.description ? sanitizeHtml(item.description.trim()) : '',
  }));

  return {
    success: true,
    data: {
      dateKey,
      items: sanitizedItems,
      planner,
    },
  };
}

/**
 * Generate secure random ID
 */
export function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  // Set version (4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;

  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Validate request origin (for CSRF protection)
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Rate limiting for API endpoints
 */
export const shareRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // 500 unique IPs per minute
  tokensPerInterval: 10, // 10 requests per IP per minute
});

/**
 * Size limit validation for request bodies
 */
export function validateRequestSize(request: Request, maxSizeBytes: number = 1024 * 1024): boolean {
  const contentLength = request.headers.get('content-length');

  if (!contentLength) {
    return false;
  }

  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxSizeBytes;
}

/**
 * Validate content type
 */
export function validateContentType(
  request: Request,
  expectedType: string = 'application/json'
): boolean {
  const contentType = request.headers.get('content-type');
  return contentType?.includes(expectedType) ?? false;
}
