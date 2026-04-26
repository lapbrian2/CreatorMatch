import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import routes from './routes';
import webhookRoutes from './routes/webhooks.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());

// Logging — `dev` is colorized text only; non-dev environments need a parsable
// format and structured logger pipe.
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (msg: string) => {
        const trimmed = msg.trim();
        if (trimmed) logger.info(trimmed);
      },
    },
    skip: () => env.NODE_ENV === 'test',
  })
);

// IMPORTANT: Stripe webhook routes are mounted BEFORE express.json() so the
// raw body is preserved for signature verification. Mounting them after
// express.json() (even with a route-level express.raw) silently breaks
// signature verification because the body has already been consumed.
app.use('/api/v1/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes);

// Tight body limit on auth — these routes only carry small JSON envelopes,
// large bodies on unauthenticated routes are a memory-DoS vector.
app.use('/api/v1/auth', express.json({ limit: '4kb' }));

// Default body parser for everything else.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Rate limiting (skip the webhook path — it's already verified by Stripe HMAC
// and Stripe will retry on 429s, which would cause permanent webhook backlog).
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/webhooks/')) return next();
  generalLimiter(req, res, next);
});

// Health check with DB liveness probe so a load balancer / k8s readiness
// probe sees `503` when the DB is unreachable.
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Health check DB ping failed:', err);
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString() });
  }
});

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
