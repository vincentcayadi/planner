import { Redis } from '@upstash/redis';

// Validate required environment variables
function validateEnvVars() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error('Missing required environment variable: UPSTASH_REDIS_REST_URL');
  }

  if (!token) {
    throw new Error('Missing required environment variable: UPSTASH_REDIS_REST_TOKEN');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid UPSTASH_REDIS_REST_URL format: must be a valid URL');
  }

  // Validate token format (should be non-empty string)
  if (typeof token !== 'string' || token.length < 10) {
    throw new Error('Invalid UPSTASH_REDIS_REST_TOKEN: must be a valid token string');
  }

  return { url, token };
}

// Validate environment and create Redis instance
const { url, token } = validateEnvVars();

export const kv = new Redis({
  url,
  token,
});

// Export validation function for testing
export { validateEnvVars };
