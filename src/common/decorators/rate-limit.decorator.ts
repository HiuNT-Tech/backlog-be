import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Custom decorator to rate limit an endpoint.
 * 
 * @param limit Maximum number of requests allowed within the time window.
 * @param ttlSeconds Time window in seconds (default is 60 seconds).
 */
export function RateLimit(limit: number, ttlSeconds: number = 60) {
  return applyDecorators(
    Throttle({ default: { limit, ttl: ttlSeconds * 1000 } })
  );
}
