import { z } from 'zod';
import { loginSchema, registerSchema } from '@creatormatch/shared-utils';

export const loginValidator = loginSchema;
export const registerValidator = registerSchema;

export const refreshTokenValidator = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordValidator = z.object({
  email: z.string().email(),
});

export const resetPasswordValidator = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordValidator = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginValidator>;
export type RegisterInput = z.infer<typeof registerValidator>;
