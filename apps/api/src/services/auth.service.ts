import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, ErrorCodes } from '../utils/response';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { User } from '@creatormatch/shared-types';
import crypto from 'crypto';

/**
 * Internal-only return shape — the raw refresh token is set as an httpOnly
 * cookie by the controller and is never serialized into a JSON response.
 */
interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, role, firstName, lastName } = input;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(ErrorCodes.ALREADY_EXISTS, 'User with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        firstName,
        lastName,
        ...(role === 'creator' && {
          creatorProfile: {
            create: {
              displayName: firstName ? `${firstName} ${lastName || ''}`.trim() : email.split('@')[0],
            },
          },
        }),
        ...(role === 'business' && {
          businessProfile: {
            create: {
              businessName: firstName ? `${firstName}'s Business` : 'My Business',
            },
          },
        }),
        notifications: {
          create: {},
        },
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      ...tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Account is deactivated', 403);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      ...tokens,
    };
  }

  /**
   * Rotates the refresh token: the presented token is revoked and a new
   * pair (access + refresh) is issued. Returns the raw refresh token so the
   * controller can place it in an httpOnly cookie.
   */
  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    if (!refreshToken) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Refresh token required', 401);
    }

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid or expired refresh token', 401);
    }

    // Atomically revoke the presented token and issue a new pair so the old
    // refresh token can never be replayed.
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      // If the presented cookie didn't match a stored token (e.g., already
      // revoked or stale), revoke ALL active tokens for this user to fail
      // closed rather than open.
      if (result.count === 0) {
        await prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async getMe(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    return this.formatUser(user);
  }

  private async generateTokens(user: { id: string; email: string; role: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'creator' | 'business' | 'admin',
    });

    const refreshToken = generateRefreshToken(user.id);
    const tokenHash = this.hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private formatUser(user: {
    id: string;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      email: user.email,
      role: user.role as 'creator' | 'business' | 'admin',
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      phone: user.phone || undefined,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
