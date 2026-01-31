import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/response';
import { CreateDealInput, DealListInput, SubmissionInput } from '../validators/deal.validator';
import { Deal, DealWithParties, DealSubmission } from '@creatormatch/shared-types';
import { PLATFORM_FEE_PERCENT } from '@creatormatch/shared-utils';

export class DealService {
  async create(userId: string, input: CreateDealInput): Promise<Deal> {
    // Verify the business owns the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      include: {
        business: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    // Verify creator exists
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: input.creatorId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator not found', 404);
    }

    // Calculate fees
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

  async list(userId: string, role: string, filters: DealListInput): Promise<{ deals: DealWithParties[]; total: number }> {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    // Get profile based on role
    let where: any = {};

    if (role === 'business') {
      const business = await prisma.businessProfile.findUnique({
        where: { userId },
      });
      if (!business) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
      }
      where.businessId = business.id;
    } else if (role === 'creator') {
      const creator = await prisma.creatorProfile.findUnique({
        where: { userId },
      });
      if (!creator) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
      }
      where.creatorId = creator.id;
    }

    if (status) {
      where.status = status;
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: { id: true, title: true, businessId: true },
          },
          business: {
            select: { id: true, businessName: true, logoUrl: true },
          },
          creator: {
            select: { id: true, displayName: true },
            include: {
              user: { select: { avatarUrl: true } },
            },
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
        campaign: {
          select: { id: true, title: true, businessId: true },
        },
        business: {
          select: { id: true, businessName: true, logoUrl: true, userId: true },
        },
        creator: {
          select: { id: true, displayName: true, userId: true },
          include: {
            user: { select: { avatarUrl: true } },
          },
        },
      },
    });

    if (!deal) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Deal not found', 404);
    }

    // Verify access
    if (deal.business.userId !== userId && deal.creator.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return this.formatDealWithParties(deal);
  }

  async accept(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyCreatorAccess(id, userId);

    if (deal.status !== 'pending') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only accept pending deals', 409);
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Update campaign accepted count
    await prisma.campaign.update({
      where: { id: deal.campaignId },
      data: { acceptedCount: { increment: 1 } },
    });

    return this.formatDeal(updated);
  }

  async reject(id: string, userId: string, reason?: string): Promise<Deal> {
    const deal = await this.verifyCreatorAccess(id, userId);

    if (deal.status !== 'pending') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only reject pending deals', 409);
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        canceledBy: userId,
        cancellationReason: reason,
      },
    });

    return this.formatDeal(updated);
  }

  async start(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyCreatorAccess(id, userId);

    if (deal.status !== 'accepted') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only start accepted deals', 409);
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return this.formatDeal(updated);
  }

  async submitContent(id: string, userId: string, input: SubmissionInput): Promise<DealSubmission> {
    const deal = await this.verifyCreatorAccess(id, userId);

    if (deal.status !== 'in_progress' && deal.status !== 'accepted') {
      throw new AppError(ErrorCodes.CONFLICT, 'Cannot submit content for this deal', 409);
    }

    const submission = await prisma.dealSubmission.create({
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

    // Update deal status
    await prisma.deal.update({
      where: { id },
      data: {
        status: 'content_submitted',
        contentSubmittedAt: new Date(),
      },
    });

    return this.formatSubmission(submission);
  }

  async approve(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyBusinessAccess(id, userId);

    if (deal.status !== 'content_submitted') {
      throw new AppError(ErrorCodes.CONFLICT, 'No content to approve', 409);
    }

    // Approve all pending submissions
    await prisma.dealSubmission.updateMany({
      where: { dealId: id, status: 'submitted' },
      data: { status: 'approved', approvedAt: new Date() },
    });

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    return this.formatDeal(updated);
  }

  async requestRevision(id: string, userId: string, notes: string): Promise<Deal> {
    const deal = await this.verifyBusinessAccess(id, userId);

    if (deal.status !== 'content_submitted') {
      throw new AppError(ErrorCodes.CONFLICT, 'No content to review', 409);
    }

    // Mark submissions as needing revision
    await prisma.dealSubmission.updateMany({
      where: { dealId: id, status: 'submitted' },
      data: { status: 'revision_requested', revisionNotes: notes },
    });

    const updated = await prisma.deal.update({
      where: { id },
      data: { status: 'in_progress' },
    });

    return this.formatDeal(updated);
  }

  async complete(id: string, userId: string): Promise<Deal> {
    const deal = await this.verifyBusinessAccess(id, userId);

    if (deal.status !== 'approved') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only complete approved deals', 409);
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Update counts
    await Promise.all([
      prisma.creatorProfile.update({
        where: { id: deal.creatorId },
        data: { completedDealsCount: { increment: 1 } },
      }),
      prisma.businessProfile.update({
        where: { id: deal.businessId },
        data: {
          completedDealsCount: { increment: 1 },
          totalSpentCents: { increment: deal.agreedAmountCents },
        },
      }),
    ]);

    return this.formatDeal(updated);
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
      include: {
        creator: {
          select: { userId: true },
        },
      },
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
      include: {
        business: {
          select: { userId: true },
        },
      },
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
