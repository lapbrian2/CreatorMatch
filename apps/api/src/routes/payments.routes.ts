import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireBusiness } from '../middleware/auth.middleware';
import { strictLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { stripe } from '../config/stripe';
import { prisma } from '../config/database';
import { sendSuccess, AppError, ErrorCodes } from '../utils/response';

const router = Router();

router.use(authenticate);

const createIntentValidator = z.object({
  dealId: z.string().uuid(),
});

/**
 * Creates a Stripe PaymentIntent for an `accepted` deal. The platform fee
 * and the destination Connect account are read from the deal record (the
 * source of truth) — never from client metadata.
 */
router.post(
  '/create-intent',
  strictLimiter,
  requireBusiness,
  validateBody(createIntentValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { dealId } = req.body as { dealId: string };

      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          business: { select: { userId: true } },
          creator: {
            select: {
              userId: true,
              stripeAccountId: true,
              stripeOnboardingComplete: true,
            },
          },
        },
      });

      if (!deal) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
      }
      if (deal.business.userId !== userId) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
      }
      if (deal.paymentStatus === 'completed') {
        throw new AppError(ErrorCodes.CONFLICT, 'Deal has already been paid', 409);
      }
      if (!['accepted', 'in_progress', 'content_submitted', 'approved'].includes(deal.status)) {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'Deal must be accepted before payment',
          409
        );
      }
      if (!deal.creator.stripeAccountId || !deal.creator.stripeOnboardingComplete) {
        throw new AppError(
          ErrorCodes.PAYMENT_REQUIRED,
          'Creator has not completed Stripe Connect onboarding',
          400
        );
      }

      const platformFeeCents = deal.platformFeeCents ?? 0;

      // `application_fee_amount` + `transfer_data.destination` makes Stripe
      // enforce the platform/creator split atomically; we never have to
      // reconcile metadata math after the fact.
      const intent = await stripe.paymentIntents.create({
        amount: deal.agreedAmountCents,
        currency: 'usd',
        capture_method: 'automatic',
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: deal.creator.stripeAccountId },
        metadata: { dealId: deal.id },
        description: `CreatorMatch deal ${deal.id}`,
      });

      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          paymentIntentId: intent.id,
          paymentStatus: 'processing',
        },
      });

      sendSuccess(res, {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ payerId: userId }, { payeeId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    sendSuccess(res, {
      transactions: transactions.map((t) => ({
        id: t.id,
        dealId: t.dealId,
        amountCents: t.amountCents,
        platformFeeCents: t.platformFeeCents,
        creatorPayoutCents: t.creatorPayoutCents,
        status: t.status,
        processedAt: t.processedAt?.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
