import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError, AppError, ErrorCodes } from '../utils/response';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(e.message);
    });
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Token expired', 401);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code: string };
    if (prismaError.code === 'P2002') {
      sendError(res, ErrorCodes.ALREADY_EXISTS, 'Resource already exists', 409);
      return;
    }
    if (prismaError.code === 'P2025') {
      sendError(res, ErrorCodes.NOT_FOUND, 'Resource not found', 404);
      return;
    }
  }

  // Default to internal server error
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;
  sendError(res, ErrorCodes.INTERNAL_ERROR, message, 500);
};

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404);
};
