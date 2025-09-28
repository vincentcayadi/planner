// src/lib/security/rateLimit.ts
interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
  tokensPerInterval: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval, tokensPerInterval } = options;
  const tokenCache = new Map<string, { count: number; reset: number }>();

  return {
    check: (token: string): RateLimitResult => {
      const now = Date.now();
      const windowStart = Math.floor(now / interval) * interval;
      const reset = windowStart + interval;

      // Clean up expired entries
      for (const [key, data] of tokenCache.entries()) {
        if (data.reset <= now) {
          tokenCache.delete(key);
        }
      }

      // Check if we've exceeded the unique token limit
      if (tokenCache.size >= uniqueTokenPerInterval && !tokenCache.has(token)) {
        return {
          success: false,
          limit: tokensPerInterval,
          remaining: 0,
          reset,
        };
      }

      // Get or create token data
      let tokenData = tokenCache.get(token);
      if (!tokenData || tokenData.reset <= now) {
        tokenData = { count: 0, reset };
        tokenCache.set(token, tokenData);
      }

      // Check rate limit
      if (tokenData.count >= tokensPerInterval) {
        return {
          success: false,
          limit: tokensPerInterval,
          remaining: 0,
          reset: tokenData.reset,
        };
      }

      // Increment counter
      tokenData.count++;

      return {
        success: true,
        limit: tokensPerInterval,
        remaining: tokensPerInterval - tokenData.count,
        reset: tokenData.reset,
      };
    },
  };
}
