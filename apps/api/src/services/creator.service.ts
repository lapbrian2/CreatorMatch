import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/response';
import { UpdateCreatorInput, CreatorSearchInput, PortfolioItemInput } from '../validators/creator.validator';
import { CreatorProfile, CreatorWithDistance, PortfolioItem, SocialAccount } from '@creatormatch/shared-types';
import { Prisma } from '@prisma/client';

export class CreatorService {
  async search(filters: CreatorSearchInput): Promise<{ creators: CreatorWithDistance[]; total: number }> {
    const {
      page,
      limit,
      sortBy = 'totalFollowers',
      sortOrder = 'desc',
      niches,
      minFollowers,
      maxFollowers,
      minEngagement,
      maxEngagement,
      lat,
      lng,
      radiusMiles,
      minRate,
      maxRate,
      isAvailable,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CreatorProfileWhereInput = {
      user: { isActive: true },
    };

    if (niches && niches.length > 0) {
      where.niches = { hasSome: niches as any };
    }

    if (minFollowers !== undefined || maxFollowers !== undefined) {
      where.totalFollowers = {
        ...(minFollowers !== undefined && { gte: minFollowers }),
        ...(maxFollowers !== undefined && { lte: maxFollowers }),
      };
    }

    if (minEngagement !== undefined || maxEngagement !== undefined) {
      where.avgEngagementRate = {
        ...(minEngagement !== undefined && { gte: minEngagement }),
        ...(maxEngagement !== undefined && { lte: maxEngagement }),
      };
    }

    if (minRate !== undefined || maxRate !== undefined) {
      where.baseRateCents = {
        ...(minRate !== undefined && { gte: minRate }),
        ...(maxRate !== undefined && { lte: maxRate }),
      };
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    // If location provided, filter by distance
    // Note: For production, use PostGIS raw queries for better performance
    if (lat !== undefined && lng !== undefined) {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }

    // Get total count
    const total = await prisma.creatorProfile.count({ where });

    // Get creators
    const orderBy: Prisma.CreatorProfileOrderByWithRelationInput = {};
    if (sortBy === 'distance' && lat !== undefined && lng !== undefined) {
      // Distance sorting requires raw query
    } else {
      orderBy[sortBy as keyof Prisma.CreatorProfileOrderByWithRelationInput] = sortOrder;
    }

    const creators = await prisma.creatorProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            avatarUrl: true,
          },
        },
        socialAccounts: {
          where: { isConnected: true },
          select: {
            platform: true,
            username: true,
            followersCount: true,
            engagementRate: true,
          },
        },
      },
    });

    // Calculate distances if location provided
    const creatorsWithDistance = creators.map((creator) => {
      let distanceMiles: number | undefined;

      if (lat !== undefined && lng !== undefined && creator.latitude && creator.longitude) {
        distanceMiles = this.calculateDistance(lat, lng, creator.latitude, creator.longitude);
      }

      return {
        ...this.formatCreator(creator),
        avatarUrl: creator.user.avatarUrl || undefined,
        distanceMiles,
        socialAccounts: creator.socialAccounts.map((sa) => ({
          id: '',
          creatorId: creator.id,
          platform: sa.platform as 'instagram' | 'tiktok' | 'youtube',
          username: sa.username || '',
          followersCount: sa.followersCount,
          followingCount: 0,
          postsCount: 0,
          avgLikes: 0,
          avgComments: 0,
          engagementRate: sa.engagementRate,
          isPrimary: false,
          isConnected: true,
        })),
      };
    });

    // Filter by radius if needed
    const filteredCreators =
      lat !== undefined && lng !== undefined
        ? creatorsWithDistance.filter(
            (c) => c.distanceMiles !== undefined && c.distanceMiles <= radiusMiles
          )
        : creatorsWithDistance;

    return {
      creators: filteredCreators,
      total: lat !== undefined ? filteredCreators.length : total,
    };
  }

  async getById(id: string): Promise<CreatorWithDistance> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            avatarUrl: true,
            email: true,
          },
        },
        socialAccounts: {
          where: { isConnected: true },
        },
        portfolioItems: {
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
          take: 20,
        },
      },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator not found', 404);
    }

    return {
      ...this.formatCreator(creator),
      avatarUrl: creator.user.avatarUrl || undefined,
      socialAccounts: creator.socialAccounts.map((sa) => this.formatSocialAccount(sa)),
      portfolioItems: creator.portfolioItems.map((pi) => this.formatPortfolioItem(pi)),
    };
  }

  async getByUserId(userId: string): Promise<CreatorProfile> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    return this.formatCreator(creator);
  }

  async update(userId: string, input: UpdateCreatorInput): Promise<CreatorProfile> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    // Calculate profile completeness
    const completeness = this.calculateProfileCompleteness({ ...creator, ...input });

    const updated = await prisma.creatorProfile.update({
      where: { userId },
      data: {
        ...input,
        profileCompleteness: completeness,
      },
    });

    return this.formatCreator(updated);
  }

  async addPortfolioItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItem> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    // Get max sort order
    const maxOrder = await prisma.portfolioItem.aggregate({
      where: { creatorId: creator.id },
      _max: { sortOrder: true },
    });

    const item = await prisma.portfolioItem.create({
      data: {
        creatorId: creator.id,
        ...input,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return this.formatPortfolioItem(item);
  }

  async removePortfolioItem(userId: string, itemId: string): Promise<void> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    const item = await prisma.portfolioItem.findFirst({
      where: { id: itemId, creatorId: creator.id },
    });

    if (!item) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Portfolio item not found', 404);
    }

    await prisma.portfolioItem.delete({ where: { id: itemId } });
  }

  async getPortfolio(creatorId: string): Promise<PortfolioItem[]> {
    const items = await prisma.portfolioItem.findMany({
      where: { creatorId },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });

    return items.map((item) => this.formatPortfolioItem(item));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateProfileCompleteness(profile: any): number {
    const fields = [
      'displayName',
      'bio',
      'headline',
      'city',
      'state',
      'niches',
      'baseRateCents',
      'websiteUrl',
    ];
    const filled = fields.filter((f) => {
      const value = profile[f];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    return Math.round((filled.length / fields.length) * 100);
  }

  private formatCreator(creator: any): CreatorProfile {
    return {
      id: creator.id,
      userId: creator.userId,
      displayName: creator.displayName,
      bio: creator.bio || undefined,
      headline: creator.headline || undefined,
      location:
        creator.latitude && creator.longitude
          ? { lat: creator.latitude, lng: creator.longitude }
          : undefined,
      city: creator.city || undefined,
      state: creator.state || undefined,
      country: creator.country,
      zipCode: creator.zipCode || undefined,
      serviceRadiusMiles: creator.serviceRadiusMiles,
      niches: creator.niches,
      websiteUrl: creator.websiteUrl || undefined,
      baseRateCents: creator.baseRateCents || undefined,
      ratePerPostCents: creator.ratePerPostCents || undefined,
      ratePerStoryCents: creator.ratePerStoryCents || undefined,
      ratePerReelCents: creator.ratePerReelCents || undefined,
      totalFollowers: creator.totalFollowers,
      avgEngagementRate: creator.avgEngagementRate,
      completedDealsCount: creator.completedDealsCount,
      avgRating: creator.avgRating,
      reviewCount: creator.reviewCount,
      profileCompleteness: creator.profileCompleteness,
      isVerified: creator.isVerified,
      isAvailable: creator.isAvailable,
      stripeAccountId: creator.stripeAccountId || undefined,
      stripeOnboardingComplete: creator.stripeOnboardingComplete,
      createdAt: creator.createdAt.toISOString(),
      updatedAt: creator.updatedAt.toISOString(),
    };
  }

  private formatSocialAccount(account: any): SocialAccount {
    return {
      id: account.id,
      creatorId: account.creatorId,
      platform: account.platform,
      username: account.username || '',
      profileUrl: account.profileUrl || undefined,
      followersCount: account.followersCount,
      followingCount: account.followingCount,
      postsCount: account.postsCount,
      avgLikes: account.avgLikes,
      avgComments: account.avgComments,
      engagementRate: account.engagementRate,
      audienceDemographics: account.audienceDemographics || undefined,
      lastSyncedAt: account.lastSyncedAt?.toISOString(),
      isPrimary: account.isPrimary,
      isConnected: account.isConnected,
    };
  }

  private formatPortfolioItem(item: any): PortfolioItem {
    return {
      id: item.id,
      creatorId: item.creatorId,
      title: item.title || undefined,
      description: item.description || undefined,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl || undefined,
      externalLink: item.externalLink || undefined,
      platform: item.platform || undefined,
      likesCount: item.likesCount || undefined,
      commentsCount: item.commentsCount || undefined,
      viewsCount: item.viewsCount || undefined,
      brandName: item.brandName || undefined,
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

export const creatorService = new CreatorService();
