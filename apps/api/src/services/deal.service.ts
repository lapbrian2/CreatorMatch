import { prisma } from '../config/database';
import { stripe } from '../config/stripe';
import { AppError, ErrorCodes } from '../utils/response';
import { logger } from '../utils/logger';
import { CreateDealInput, DealListInput, SubmissionInput } from '../validators/deal.validator';
import { Deal, DealWithParties, DealSubmission } from '@creatormatch/shared-types';
import { PLATFORM_FEE_PERCENT } from '@creatormatch/shared-utils';
import { Prisma } from '@prisma/client';

export class DealService {
  async create(userId: string, input: CreateDealInput): Promise<Deal> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      include: {
        business: { select: { id: true, userId: true } },
      },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: input.creatorId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator not found', 404);
    }

    // Duplicate-deal guard: a business cannot have two active proposals to
    // the same creator on the same campaign. Active = anything other than
    // canceled or completed.
    const existing = await prisma.deal.findFirst({
      where: {
        campaignId: input.campaignId,
        creatorId: input.creatorId,
        status: { notIn: ['canceled', 'completed'] },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        'An active deal already exists for this creator on this campaign',
        409
      );
    }

    const platformFeeCents = Math.round(input.agreedAmountCents * (PLATFORM_FEE_PERCENT / 100));
    const creatorPayoutCents = input.agreedAmountCents - platformFeeCents;

    const deal = await prisma.deal.create({
      data: {
        campaignId: input.campaignId,
        businessId: campaign.business.id,
        creatorId: input.creatorId,
        agreedAmountCents: input.agreedAmountCents,
        platformFeeCents,
        creatorPayoutCents,
        deliverables: input.deliverables,
        specialRequirements: input.specialRequirements,
        businessNotes: input.businessNotes,
        status: 'pending',
        paymentStatus: 'pending',
      },
    });

    return this.formatDeal(deal);
  }

  async list(
    userId: string,
    role: string,
    filters: DealListInput
  ): Promise<{ deals: DealWithParties[]; total: number }> {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    let where: Prisma.DealWhereInput = {};

    if (role === 'business') {
      const business = await prisma.businessProfile.findUnique({ where: { userId } });
      if (!business) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
      }
      where.businessId = business.id;
    } else if (role === 'creator') {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
      if (!creator) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
      }
      where.creatorId = creator.id;
    }

    if (status) where.status = status;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, title: true, businessId: true } },
          business: { select: { id: true, businessName: true, logoUrl: true } },
          creator: {
            select: { id: true, displayName: true },
            include: { user: { select: { avatarUrl: true } } },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return {
      deals: deals.map((d) => this.formatDealWithParties(d)),
      total,
    };
  }

  async getById(id: string, userId: string): Promise<DealWithParties> {
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, title: true, businessId: true } },
        business: { select: { id: true, businessName: true, logoUrl: true, userId: true } },
        creator: {
          select: { id: true, displayName: true, userId: true },
          include: { user: { select: { avatarUrl: true } } },
        },
      },
    });

    if (!deal) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
    }

    if (deal.business.userId !== userId && deal.creator.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return this.formatDealWithParties(deal);
  }

  /**
   * Atomic state transition: only flips a deal from `pending` -> `accepted`
   * if no concurrent request beat us to it. This pattern (`updateMany` with
   * a status filter) is used everywhere a state transition could race.
   */
  async accept(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyCreatorAccess(id, userId);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new AppError(ErrorCodes.CONFLICT, 'Deal is no longer pending', 409);
      }

      await tx.campaign.update({
        where: { id: deal.campaignId },
        data: { acceptedCount: { increment: 1 } },
      });

      return tx.deal.findUniqueOrThrow({ where: { id } });
    });

    return this.formatDeal(result);
  }

  async reject(id: string, userId: string, reason?: string): Promise<Deal> {
    await this.verifyCreatorAccess(id, userId);

    const result = await prisma.deal.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        canceledBy: userId,
        cancellationReason: reason,
      },
    });

    if (result.count === 0) {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only reject pending deals', 409);
    }

    return this.formatDeal(await prisma.deal.findUniqueOrThrow({ where: { id } }));
  }

  async start(id: string, userId: string): Promise<Deal> {
    await this.verifyCreatorAccess(id, userId);

    const result = await prisma.deal.updateMany({
      where: { id, status: 'accepted' },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only start accepted deals', 409);
    }

    return this.formatDeal(await prisma.deal.findUniqueOrThrow({ where: { id } }));
  }

  /**
   * Tightened state guard: creators must explicitly transition through
   * `in_progress` (via `start`) before submitting content. This keeps
   * `startedAt` populated for SLA / analytics.
   */
  async submitContent(id: string, userId: string, input: SubmissionInput): Promise<DealSubmission> {
    await this.verifyCreatorAccess(id, userId);

    const submission = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.updateMany({
        where: { id, status: 'in_progress' },
        data: { status: 'content_submitted', contentSubmittedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'Deal must be in progress to submit content (call /start first)',
          409
        );
      }

      return tx.dealSubmission.create({
        data: {
          dealId: id,
          contentType: input.contentType,
          contentUrl: input.contentUrl,
          thumbnailUrl: input.thumbnailUrl,
          caption: input.caption,
          platformPostUrl: input.platformPostUrl,
          status: 'submitted',
        },
      });
    });

    return this.formatSubmission(submission);
  }

  async approve(id: string, userId: string): Promise<Deal> {
    await this.verifyBusinessAccess(id, userId);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.updateMany({
        where: { id, status: 'content_submitted' },
        data: { status: 'approved', approvedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new AppError(ErrorCodes.CONFLICT, 'No content to approve', 409);
      }

      await tx.dealSubmission.updateMany({
        where: { dealId: id, status: 'submitted' },
        data: { status: 'approved', approvedAt: new Date() },
      });

      return tx.deal.findUniqueOrThrow({ where: { id } });
    });

    return this.formatDeal(result);
  }

  async requestRevision(id: string, userId: string, notes: string): Promise<Deal> {
    await this.verifyBusinessAccess(id, userId);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.updateMany({
        where: { id, status: 'content_submitted' },
        data: { status: 'in_progress' },
      });

      if (updated.count === 0) {
        throw new AppError(ErrorCodes.CONFLICT, 'No content to review', 409);
      }

      await tx.dealSubmission.updateMany({
        where: { dealId: id, status: 'submitted' },
        data: { status: 'revision_requested', revisionNotes: notes },
      });

      return tx.deal.findUniqueOrThrow({ where: { id } });
    });

    return this.formatDeal(result);
  }

  /**
   * Completes the deal AND issues the Stripe Connect transfer to the
   * creator. Both the state transition and the Stripe transfer are
   * coordinated so partial failures cannot leave the deal in a "completed
   * with no payout" state.
   *
   * Order of operations:
   *  1. Verify creator's Connect account is ready for payouts.
   *  2. Atomic DB transition: deal -> completed + counters incremented.
   *  3. Issue Stripe Transfer to the connected account.
   *  4. If the Transfer call fails, roll the deal back to `approved` and
   *     undo the counter increments so the operation is retryable.
   */
  async complete(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyBusinessAccess(id, userId);

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: deal.creatorId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator not found', 404);
    }

    if (!creator.stripeAccountId || !creator.stripeOnboardingComplete) {
      throw new AppError(
        ErrorCodes.PAYMENT_REQUIRED,
        'Creator has not completed Stripe Connect onboarding — payout cannot be issued',
        400
      );
    }

    if (deal.paymentStatus !== 'completed') {
      throw new AppError(
        ErrorCodes.PAYMENT_REQUIRED,
        'Deal payment has not been captured yet',
        400
      );
    }

    // Atomic transition. `updateMany` with the status filter prevents two
    // concurrent /complete requests both passing the guard.
    const transitioned = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.updateMany({
        where: { id, status: 'approved' },
        data: { status: 'completed', completedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new AppError(ErrorCodes.CONFLICT, 'Can only complete approved deals', 409);
      }

      await tx.creatorProfile.update({
        where: { id: deal.creatorId },
        data: { completedDealsCount: { increment: 1 } },
      });

      await tx.businessProfile.update({
        where: { id: deal.businessId },
        data: {
          completedDealsCount: { increment: 1 },
          totalSpentCents: { increment: deal.agreedAmountCents },
        },
      });

      return tx.deal.findUniqueOrThrow({ where: { id } });
    });

    const payoutCents = deal.creatorPayoutCents ?? deal.agreedAmountCents;

    try {
      await stripe.transfers.create({
        amount: payoutCents,
        currency: 'usd',
        destination: creator.stripeAccountId,
        transfer_group: deal.id,
        metadata: { dealId: deal.id, creatorId: deal.creatorId },
      });
    } catch (err) {
      // Roll back the state transition so the deal can be retried. We log
      // loudly so the on-call rotation can investigate the underlying Stripe
      // error.
      logger.error(`Stripe transfer failed for deal ${deal.id} — rolling back complete:`, err);

      await prisma.$transaction([
        prisma.deal.update({
          where: { id },
          data: { status: 'approved', completedAt: null },
        }),
        prisma.creatorProfile.update({
          where: { id: deal.creatorId },
          data: { completedDealsCount: { decrement: 1 } },
        }),
        prisma.businessProfile.update({
          where: { id: deal.businessId },
          data: {
            completedDealsCount: { decrement: 1 },
            totalSpentCents: { decrement: deal.agreedAmountCents },
          },
        }),
      ]);

      throw new AppError(
        ErrorCodes.STRIPE_ERROR,
        'Failed to issue creator payout — please try again',
        502
      );
    }

    return this.formatDeal(transitioned);
  }

  async getSubmissions(dealId: string, userId: string): Promise<DealSubmission[]> {
    await this.verifyAccess(dealId, userId);

    const submissions = await prisma.dealSubmission.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
    });

    return submissions.map((s) => this.formatSubmission(s));
  }

  private async verifyCreatorAccess(dealId: string, userId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { creator: { select: { userId: true } } },
    });

    if (!deal) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
    }

    if (deal.creator.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return deal;
  }

  private async verifyBusinessAccess(dealId: string, userId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { business: { select: { userId: true } } },
    });

    if (!deal) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
    }

    if (deal.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return deal;
  }

  private async verifyAccess(dealId: string, userId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        business: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });

    if (!deal) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
    }

    if (deal.business.userId !== userId && deal.creator.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return deal;
  }

  private formatDeal(deal: any): Deal {
    return {
      id: deal.id,
      campaignId: deal.campaignId,
      businessId: deal.businessId,
      creatorId: deal.creatorId,
      agreedAmountCents: deal.agreedAmountCents,
      platformFeeCents: deal.platformFeeCents,
      creatorPayoutCents: deal.creatorPayoutCents,
      deliverables: deal.deliverables,
      specialRequirements: deal.specialRequirements || undefined,
      status: deal.status,
      proposedAt: deal.proposedAt.toISOString(),
      acceptedAt: deal.acceptedAt?.toISOString(),
      startedAt: deal.startedAt?.toISOString(),
      contentSubmittedAt: deal.contentSubmittedAt?.toISOString(),
      approvedAt: deal.approvedAt?.toISOString(),
      completedAt: deal.completedAt?.toISOString(),
      canceledAt: deal.canceledAt?.toISOString(),
      canceledBy: deal.canceledBy || undefined,
      cancellationReason: deal.cancellationReason || undefined,
      paymentStatus: deal.paymentStatus,
      paymentIntentId: deal.paymentIntentId || undefined,
      paidAt: deal.paidAt?.toISOString(),
      businessNotes: deal.businessNotes || undefined,
      creatorNotes: deal.creatorNotes || undefined,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }

  private formatDealWithParties(deal: any): DealWithParties {
    return {
      ...this.formatDeal(deal),
      campaign: {
        id: deal.campaign.id,
        title: deal.campaign.title,
        businessId: deal.campaign.businessId,
      },
      business: {
        id: deal.business.id,
        businessName: deal.business.businessName,
        logoUrl: deal.business.logoUrl || undefined,
      },
      creator: {
        id: deal.creator.id,
        displayName: deal.creator.displayName,
        avatarUrl: deal.creator.user?.avatarUrl || undefined,
      },
    };
  }

  private formatSubmission(submission: any): DealSubmission {
    return {
      id: submission.id,
      dealId: submission.dealId,
      contentType: submission.contentType,
      contentUrl: submission.contentUrl || undefined,
      thumbnailUrl: submission.thumbnailUrl || undefined,
      caption: submission.caption || undefined,
      platformPostId: submission.platformPostId || undefined,
      platformPostUrl: submission.platformPostUrl || undefined,
      likesCount: submission.likesCount || undefined,
      commentsCount: submission.commentsCount || undefined,
      viewsCount: submission.viewsCount || undefined,
      reach: submission.reach || undefined,
      impressions: submission.impressions || undefined,
      status: submission.status,
      revisionNotes: submission.revisionNotes || undefined,
      submittedAt: submission.submittedAt.toISOString(),
      approvedAt: submission.approvedAt?.toISOString(),
    };
  }
}

export const dealService = new DealService();
