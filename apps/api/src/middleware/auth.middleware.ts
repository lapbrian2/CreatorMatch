import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { AppError, ErrorCodes } from '../utils/response';
import { UserRole } from '@creatormatch/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * All middleware here propagates errors via `next(err)` rather than `throw`.
 * `throw` works in Express 4 sync contexts but silently breaks the moment
 * any of these helpers becomes async (a realistic migration path) — using
 * `next(err)` is unconditionally safe.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token', 401));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      // Token invalid, but we continue without auth.
    }
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          ErrorCodes.FORBIDDEN,
          'You do not have permission to access this resource',
          403
        )
      );
    }
    next();
  };
}

export function requireCreator(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401));
  }
  if (req.user.role !== 'creator') {
    return next(new AppError(ErrorCodes.FORBIDDEN, 'Creator account required', 403));
  }
  next();
}

export function requireBusiness(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401));
  }
  if (req.user.role !== 'business') {
    return next(new AppError(ErrorCodes.FORBIDDEN, 'Business account required', 403));
  }
  next();
}
