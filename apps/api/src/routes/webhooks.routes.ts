import { Router, raw } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();

// Stripe webhook - needs raw body
router.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.businessId;

        if (businessId && session.subscription) {
          await prisma.businessProfile.update({
            where: { id: businessId },
            data: {
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
              subscriptionPlan: 'basic',
              subscriptionStartedAt: new Date(),
            },
          });
          logger.info(`Subscription activated for business ${businessId}`);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (businessId) {
          let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active';

          if (subscription.status === 'active') {
            status = subscription.cancel_at_period_end ? 'canceled' : 'active';
          } else if (subscription.status === 'past_due') {
            status = 'past_due';
          } else if (subscription.status === 'trialing') {
            status = 'trialing';
          } else {
            status = 'canceled';
          }

          await prisma.businessProfile.update({
            where: { id: businessId },
            data: {
              subscriptionStatus: status,
              subscriptionEndsAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : null,
            },
          });
          logger.info(`Subscription updated for business ${businessId}: ${status}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const businessId = invoice.metadata?.businessId ||
          (invoice.subscription_details?.metadata?.businessId);

        if (businessId && invoice.subscription) {
          await prisma.subscriptionPayment.create({
            data: {
              businessId,
              stripeInvoiceId: invoice.id,
              stripeSubscriptionId: invoice.subscription as string,
              amountCents: invoice.amount_paid,
              status: 'paid',
              billingPeriodStart: invoice.period_start
                ? new Date(invoice.period_start * 1000)
                : null,
              billingPeriodEnd: invoice.period_end
                ? new Date(invoice.period_end * 1000)
                : null,
              paidAt: new Date(),
            },
          });
          logger.info(`Invoice paid for business ${businessId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const businessId = invoice.metadata?.businessId;

        if (businessId) {
          await prisma.businessProfile.update({
            where: { id: businessId },
            data: { subscriptionStatus: 'past_due' },
          });
          logger.warn(`Payment failed for business ${businessId}`);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const creatorId = account.metadata?.creatorId;

        if (creatorId) {
          const status = account.details_submitted
            ? account.payouts_enabled
              ? 'active'
              : 'pending'
            : 'incomplete';

          await prisma.creatorProfile.update({
            where: { id: creatorId },
            data: {
              stripeAccountStatus: status,
              stripeOnboardingComplete: account.details_submitted && account.payouts_enabled,
            },
          });
          logger.info(`Connect account updated for creator ${creatorId}: ${status}`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const dealId = paymentIntent.metadata?.dealId;

        if (dealId) {
          await prisma.deal.update({
            where: { id: dealId },
            data: {
              paymentStatus: 'completed',
              paidAt: new Date(),
            },
          });

          await prisma.transaction.create({
            data: {
              dealId,
              payerId: paymentIntent.metadata.businessUserId,
              payeeId: paymentIntent.metadata.creatorUserId,
              amountCents: paymentIntent.amount,
              platformFeeCents: parseInt(paymentIntent.metadata.platformFee || '0'),
              creatorPayoutCents: paymentIntent.amount - parseInt(paymentIntent.metadata.platformFee || '0'),
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: paymentIntent.latest_charge as string,
              status: 'completed',
              processedAt: new Date(),
            },
          });
          logger.info(`Payment succeeded for deal ${dealId}`);
        }
        break;
      }

      default:
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
