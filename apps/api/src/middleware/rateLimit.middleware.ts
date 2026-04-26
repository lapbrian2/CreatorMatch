import rateLimit, { Options, Store } from 'express-rate-limit';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let redisClient: import('ioredis').Redis | null = null;
let storeFactory: (() => Store) | null = null;

if (env.REDIS_URL) {
  try {
    // Lazy import so projects without Redis configured don't crash at boot.
    const Redis = require('ioredis');
    const RedisStore = require('rate-limit-redis').default;

    redisClient = new Redis(env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    redisClient!.on('error', (err) => logger.error('Redis client error:', err));

    storeFactory = () =>
      new RedisStore({
        // The `sendCommand` adapter shape is what rate-limit-redis@4 expects.
        sendCommand: (...args: string[]) => (redisClient as any).call(...args),
      }) as Store;

    logger.info('Rate limiter using Redis store');
  } catch (err) {
    logger.error('Failed to initialize Redis store, falling back to in-memory:', err);
    storeFactory = null;
  }
} else if (env.NODE_ENV === 'production') {
  logger.warn(
    'REDIS_URL not set in production — rate limiter is process-local and will be ' +
      'bypassed by horizontal scaling. Set REDIS_URL to enable shared limits.'
  );
}

function makeLimiter(opts: Partial<Options>): ReturnType<typeof rateLimit> {
  const config: Partial<Options> = {
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  };
  if (storeFactory) config.store = storeFactory();
  return rateLimit(config);
}

export const generalLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

export const strictLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
