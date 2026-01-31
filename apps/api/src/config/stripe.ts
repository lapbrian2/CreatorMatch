import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const STRIPE_CONFIG = {
  basicPlanPriceId: env.STRIPE_BASIC_PLAN_PRICE_ID,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  trialDays: 14,
  platformFeePercent: 10,
};
