import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, ErrorCodes } from '../utils/response';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { User, AuthResponse, AuthTokens } from '@creatormatch/shared-types';
import crypto from 'crypto';

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, role, firstName, lastName } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(ErrorCodes.ALREADY_EXISTS, 'User with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with profile
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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Account is deactivated', 403);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Refresh token required', 401);
    }

    // Verify token
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    // Find token in database
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

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      const tokenHash = this.hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all tokens for user
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
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

  private async generateTokens(user: { id: string; email: string; role: string }): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'creator' | 'business' | 'admin',
    });

    const refreshToken = generateRefreshToken(user.id);
    const tokenHash = this.hashToken(refreshToken);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      expiresIn: 900, // 15 minutes in seconds
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
