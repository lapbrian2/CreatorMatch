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

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token', 401);
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
      // Token invalid, but we continue without auth
    }
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'You do not have permission to access this resource',
        403
      );
    }

    next();
  };
}

export function requireCreator(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }

  if (req.user.role !== 'creator') {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Creator account required', 403);
  }

  next();
}

export function requireBusiness(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }

  if (req.user.role !== 'business') {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Business account required', 403);
  }

  next();
}
