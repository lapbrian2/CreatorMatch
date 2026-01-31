import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/response';
import { CreateCampaignInput, UpdateCampaignInput, CampaignListInput } from '../validators/campaign.validator';
import { Campaign } from '@creatormatch/shared-types';
import { businessService } from './business.service';

export class CampaignService {
  async create(userId: string, input: CreateCampaignInput): Promise<Campaign> {
    // Check subscription
    const hasSubscription = await businessService.hasActiveSubscription(userId);
    if (!hasSubscription) {
      throw new AppError(
        ErrorCodes.SUBSCRIPTION_REQUIRED,
        'Active subscription required to create campaigns',
        403
      );
    }

    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    const campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        title: input.title,
        description: input.description,
        objective: input.objective,
        requiredContentTypes: input.requiredContentTypes,
        requiredDeliverables: input.requiredDeliverables,
        brandGuidelines: input.brandGuidelines,
        hashtags: input.hashtags || [],
        mentions: input.mentions || [],
        targetNiches: input.targetNiches || [],
        minFollowers: input.minFollowers,
        maxFollowers: input.maxFollowers,
        minEngagementRate: input.minEngagementRate,
        targetLatitude: input.targetLat,
        targetLongitude: input.targetLng,
        targetRadiusMiles: input.targetRadiusMiles || 25,
        budgetCents: input.budgetCents,
        paymentPerCreatorCents: input.paymentPerCreatorCents,
        maxCreators: input.maxCreators || 1,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        contentDeadline: input.contentDeadline ? new Date(input.contentDeadline) : undefined,
        status: 'draft',
      },
    });

    return this.formatCampaign(campaign);
  }

  async list(userId: string, filters: CampaignListInput): Promise<{ campaigns: Campaign[]; total: number }> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
      businessId: business.id,
      ...(status && { status }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map((c) => this.formatCampaign(c)),
      total,
    };
  }

  async getById(id: string, userId?: string): Promise<Campaign> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            userId: true,
            businessName: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    // If userId provided, verify ownership
    if (userId && campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return this.formatCampaign(campaign);
  }

  async update(id: string, userId: string, input: UpdateCampaignInput): Promise<Campaign> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        business: {
          select: { userId: true },
        },
      },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only edit draft or paused campaigns', 409);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...input,
        targetLatitude: input.targetLat,
        targetLongitude: input.targetLng,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        contentDeadline: input.contentDeadline ? new Date(input.contentDeadline) : undefined,
      },
    });

    return this.formatCampaign(updated);
  }

  async launch(id: string, userId: string): Promise<Campaign> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        business: {
          select: { userId: true },
        },
      },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }

    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    if (campaign.status !== 'draft') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only launch draft campaigns', 409);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });

    // Update business active campaigns count
    await prisma.businessProfile.update({
      where: { id: campaign.businessId },
      data: { activeCampaignsCount: { increment: 1 } },
    });

    return this.formatCampaign(updated);
  }

  async pause(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.getById(id, userId);

    if (campaign.status !== 'active') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only pause active campaigns', 409);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'paused' },
    });

    return this.formatCampaign(updated);
  }

  async resume(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.getById(id, userId);

    if (campaign.status !== 'paused') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only resume paused campaigns', 409);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });

    return this.formatCampaign(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const campaign = await this.getById(id, userId);

    if (campaign.status !== 'draft') {
      throw new AppError(ErrorCodes.CONFLICT, 'Can only delete draft campaigns', 409);
    }

    await prisma.campaign.delete({ where: { id } });
  }

  private formatCampaign(campaign: any): Campaign {
    return {
      id: campaign.id,
      businessId: campaign.businessId,
      title: campaign.title,
      description: campaign.description || undefined,
      objective: campaign.objective || undefined,
      requiredContentTypes: campaign.requiredContentTypes,
      requiredDeliverables: campaign.requiredDeliverables as any,
      brandGuidelines: campaign.brandGuidelines || undefined,
      hashtags: campaign.hashtags,
      mentions: campaign.mentions,
      targetNiches: campaign.targetNiches,
      minFollowers: campaign.minFollowers || undefined,
      maxFollowers: campaign.maxFollowers || undefined,
      minEngagementRate: campaign.minEngagementRate || undefined,
      targetLocation:
        campaign.targetLatitude && campaign.targetLongitude
          ? { lat: campaign.targetLatitude, lng: campaign.targetLongitude }
          : undefined,
      targetRadiusMiles: campaign.targetRadiusMiles,
      budgetCents: campaign.budgetCents,
      paymentPerCreatorCents: campaign.paymentPerCreatorCents || undefined,
      maxCreators: campaign.maxCreators,
      startDate: campaign.startDate?.toISOString(),
      endDate: campaign.endDate?.toISOString(),
      contentDeadline: campaign.contentDeadline?.toISOString(),
      status: campaign.status,
      invitedCount: campaign.invitedCount,
      appliedCount: campaign.appliedCount,
      acceptedCount: campaign.acceptedCount,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}

export const campaignService = new CampaignService();
