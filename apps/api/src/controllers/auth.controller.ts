import { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: SEVEN_DAYS_MS,
  };
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

      sendSuccess(
        res,
        {
          user: result.user,
          tokens: { accessToken: result.accessToken, expiresIn: result.expiresIn },
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

      sendSuccess(res, {
        user: result.user,
        tokens: { accessToken: result.accessToken, expiresIn: result.expiresIn },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const presented = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const tokens = await authService.refresh(presented);

      res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());

      sendSuccess(res, {
        tokens: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

      await authService.logout(userId, refreshToken);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
      });

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const user = await authService.getMe(userId);

      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
