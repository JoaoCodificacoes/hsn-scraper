import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client explicitly using KV REST API variables mapped by Upstash
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

// Create a global rate limiter: maximum 10 requests per day total to prevent abuse.
export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'),
});

// User-based rate limiter to protect the DB from Discord command spam
export const discordRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(15, '1 m'),
});
