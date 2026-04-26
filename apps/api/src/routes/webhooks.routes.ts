import { Router, Request, Response } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();

/**
 * Stripe webhook handler.
 *
 * - Mounted in `app.ts` BEFORE the global `express.json()` so the raw body
 *   reaches `constructEvent` unmodified.
 * - Every handler is idempotent: Stripe retries on any non-2xx response for
 *   up to 72h, so duplicate events MUST be a no-op.
 * - We never trust metadata for financial truth — the deal record is the
 *   source of truth; metadata is only used as a lookup key.
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    // `req.body` is a Buffer here because the raw body parser is mounted on
    // this path in app.ts.
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }

      case 'invoice.payment_failed': {
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      }

      case 'account.updated': {
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      }

      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case 'transfer.created':
      case 'transfer.reversed': {
        await handleTransferEvent(event.data.object as Stripe.Transfer);
        break;
      }

      default:
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }

    if (!res.headersSent) res.json({ received: true });
  } catch (error) {
    logger.error(`Webhook handler error for event ${event.id} (${event.type}):`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const businessId = session.metadata?.businessId;
  if (!businessId) {
    logger.error('checkout.session.completed missing metadata.businessId');
    return;
  }

  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) {
    logger.error(`checkout.session.completed: businessId ${businessId} not found`);
    return;
  }

  if (!session.subscription) return;

  // Trial sessions complete with payment_status="no_payment_required" — those
  // start a trial, not an active paying subscription.
  const isTrial = session.payment_status === 'no_payment_required';
  const isPaid = session.payment_status === 'paid';

  if (!isTrial && !isPaid) return;

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: {
      stripeSubscriptionId: session.subscription as string,
      subscriptionStatus: isTrial ? 'trialing' : 'active',
      subscriptionPlan: 'basic',
      subscriptionStartedAt: new Date(),
    },
  });

  logger.info(`Subscription ${isTrial ? 'trial started' : 'activated'} for business ${businessId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) {
    logger.error('subscription event missing metadata.businessId');
    return;
  }

  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) return;

  let status: 'active' | 'canceled' | 'past_due' | 'trialing';
  switch (subscription.status) {
    case 'active':
      status = subscription.cancel_at_period_end ? 'canceled' : 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'trialing':
      status = 'trialing';
      break;
    default:
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

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const businessId =
    invoice.metadata?.businessId ||
    invoice.subscription_details?.metadata?.businessId;

  if (!businessId || !invoice.id || !invoice.subscription) return;

  // Idempotent — `stripeInvoiceId` has a unique constraint, so `upsert` makes
  // duplicate retries a no-op.
  await prisma.subscriptionPayment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      businessId,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription as string,
      amountCents: invoice.amount_paid,
      status: 'paid',
      billingPeriodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null,
      billingPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      paidAt: new Date(),
    },
    update: {},
  });

  logger.info(`Invoice paid for business ${businessId}`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const businessId = invoice.metadata?.businessId;
  if (!businessId) return;

  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) return;

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.warn(`Payment failed for business ${businessId}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  const creatorId = account.metadata?.creatorId;
  if (!creatorId) return;

  const creator = await prisma.creatorProfile.findUnique({ where: { id: creatorId } });
  if (!creator) return;

  const status = account.details_submitted
    ? account.payouts_enabled
      ? 'active'
      : 'pending'
    : 'incomplete';

  await prisma.creatorProfile.update({
    where: { id: creatorId },
    data: {
      stripeAccountStatus: status,
      stripeOnboardingComplete: Boolean(account.details_submitted && account.payouts_enabled),
    },
  });

  logger.info(`Connect account updated for creator ${creatorId}: ${status}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const dealId = paymentIntent.metadata?.dealId;
  if (!dealId) {
    logger.error(`payment_intent.succeeded ${paymentIntent.id} missing metadata.dealId`);
    return;
  }

  // Idempotent — `stripePaymentIntentId` has a unique constraint, so duplicate
  // webhook retries cannot create a second Transaction row.
  const existing = await prisma.transaction.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });
  if (existing) {
    logger.debug(`payment_intent.succeeded ${paymentIntent.id} already processed`);
    return;
  }

  // Look up the deal to pull authoritative fee + party data — we never trust
  // metadata for financial truth.
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      business: { select: { userId: true } },
      creator: { select: { userId: true } },
    },
  });

  if (!deal) {
    logger.error(`payment_intent.succeeded ${paymentIntent.id} references missing deal ${dealId}`);
    return;
  }

  const platformFeeCents = deal.platformFeeCents ?? 0;
  const creatorPayoutCents = deal.creatorPayoutCents ?? paymentIntent.amount - platformFeeCents;

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: dealId },
      data: {
        paymentStatus: 'completed',
        paymentIntentId: paymentIntent.id,
        paidAt: new Date(),
      },
    }),
    prisma.transaction.create({
      data: {
        dealId,
        payerId: deal.business.userId,
        payeeId: deal.creator.userId,
        amountCents: paymentIntent.amount,
        platformFeeCents,
        creatorPayoutCents,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge as string | null,
        status: 'completed',
        processedAt: new Date(),
      },
    }),
  ]);

  logger.info(`Payment succeeded for deal ${dealId}`);
}

async function handleTransferEvent(transfer: Stripe.Transfer) {
  const dealId = transfer.metadata?.dealId;
  if (!dealId) return;

  await prisma.transaction.updateMany({
    where: { dealId },
    data: { stripeTransferId: transfer.id },
  });

  logger.info(`Transfer ${transfer.id} recorded for deal ${dealId}`);
}

export default router;
