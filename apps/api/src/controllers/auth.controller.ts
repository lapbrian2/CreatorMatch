import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { env } from '../config/env';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);

      // Set refresh token as HTTP-only cookie
      this.setRefreshTokenCookie(res, result.tokens.accessToken);

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      this.setRefreshTokenCookie(res, result.tokens.accessToken);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const tokens = await authService.refresh(refreshToken);

      this.setRefreshTokenCookie(res, tokens.accessToken);

      sendSuccess(res, { tokens });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const refreshToken = req.cookies.refreshToken;

      await authService.logout(userId, refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
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

  private setRefreshTokenCookie(res: Response, _accessToken: string) {
    // Note: In a real implementation, we'd set the refresh token here
    // For now, we're returning it in the response body for simplicity
    res.cookie('refreshToken', 'token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }
}

export const authController = new AuthController();
