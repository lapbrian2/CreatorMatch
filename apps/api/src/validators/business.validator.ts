import { z } from 'zod';
import { businessProfileSchema } from '@creatormatch/shared-utils';
import { env } from '../config/env';

export const updateBusinessValidator = businessProfileSchema.partial();

const allowedOrigin = (() => {
  try {
    return new URL(env.APP_URL).origin;
  } catch {
    return null;
  }
})();

const sameOriginUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      if (!allowedOrigin) return false;
      try {
        return new URL(value).origin === allowedOrigin;
      } catch {
        return false;
      }
    },
    {
      message: `URL must share the application origin (${allowedOrigin ?? 'APP_URL not set'})`,
    }
  );

export const subscriptionCheckoutValidator = z.object({
  successUrl: sameOriginUrl,
  cancelUrl: sameOriginUrl,
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessValidator>;
export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutValidator>;
