import { z } from 'zod';
import { businessProfileSchema } from '@creatormatch/shared-utils';

export const updateBusinessValidator = businessProfileSchema.partial();

export const subscriptionCheckoutValidator = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessValidator>;
export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutValidator>;
