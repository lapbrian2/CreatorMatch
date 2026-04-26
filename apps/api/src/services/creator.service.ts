import { prisma } from '../config/database';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../utils/response';
import { logger } from '../utils/logger';
import { UpdateCreatorInput, CreatorSearchInput, PortfolioItemInput } from '../validators/creator.validator';
import { CreatorProfile, CreatorWithDistance, PortfolioItem, SocialAccount } from '@creatormatch/shared-types';
import { Prisma } from '@prisma/client';

const MAX_SEARCH_LIMIT = 50;
// Fields that, if changed, must invalidate cached match scores so businesses
// see fresh recommendations.
const MATCH_INVALIDATING_FIELDS = new Set([
  'niches',
  'baseRateCents',
  'isAvailable',
  'totalFollowers',
  'avgEngagementRate',
  'latitude',
  'longitude',
]);

interface RawCreatorRow {
  id: string;
  distance_miles: number | null;
}

export class CreatorService {
  async search(filters: CreatorSearchInput): Promise<{ creators: CreatorWithDistance[]; total: number }> {
    const {
      page,
      limit: rawLimit,
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

    const limit = Math.min(rawLimit ?? 20, MAX_SEARCH_LIMIT);
    const skip = (page - 1) * limit;

    if (lat !== undefined && lng !== undefined) {
      return this.searchWithGeo({
        lat,
        lng,
        radiusMiles: radiusMiles ?? 25,
        page,
        limit,
        skip,
        sortBy,
        sortOrder,
        niches,
        minFollowers,
        maxFollowers,
        minEngagement,
        maxEngagement,
        minRate,
        maxRate,
        isAvailable,
      });
    }

    const where: Prisma.CreatorProfileWhereInput = {
      user: { isActive: true },
    };

    if (niches && niches.length > 0) where.niches = { hasSome: niches as any };

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

    if (isAvailable !== undefined) where.isAvailable = isAvailable;

    const orderBy: Prisma.CreatorProfileOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Prisma.CreatorProfileOrderByWithRelationInput] = sortOrder;

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { avatarUrl: true } },
          socialAccounts: {
            where: { isConnected: true },
            select: { platform: true, username: true, followersCount: true, engagementRate: true },
          },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);

    return {
      creators: creators.map((creator) => ({
        ...this.formatPublicCreator(creator),
        avatarUrl: creator.user.avatarUrl || undefined,
        socialAccounts: this.formatPublicSocials(creator.socialAccounts, creator.id),
      })),
      total,
    };
  }

  /**
   * Geo-radius search backed by PostGIS. The `location` column on
   * `creator_profiles` is kept in sync by a DB trigger (see
   * `prisma/migrations/manual/postgis.sql`) so this query uses a GIST index
   * via `ST_DWithin` and returns the true filtered total for pagination.
   */
  private async searchWithGeo(args: {
    lat: number;
    lng: number;
    radiusMiles: number;
    page: number;
    limit: number;
    skip: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    niches?: string[];
    minFollowers?: number;
    maxFollowers?: number;
    minEngagement?: number;
    maxEngagement?: number;
    minRate?: number;
    maxRate?: number;
    isAvailable?: boolean;
  }): Promise<{ creators: CreatorWithDistance[]; total: number }> {
    const radiusMeters = args.radiusMiles * 1609.344;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${args.lng}, ${args.lat}), 4326)::geography`;

    // Build filter SQL fragments.
    const filters: Prisma.Sql[] = [
      Prisma.sql`u.is_active = true`,
      Prisma.sql`cp.location IS NOT NULL`,
      Prisma.sql`ST_DWithin(cp.location::geography, ${point}, ${radiusMeters})`,
    ];

    if (args.niches && args.niches.length > 0) {
      filters.push(Prisma.sql`cp.niches && ARRAY[${Prisma.join(args.niches)}]::"NicheCategory"[]`);
    }
    if (args.minFollowers !== undefined) filters.push(Prisma.sql`cp.total_followers >= ${args.minFollowers}`);
    if (args.maxFollowers !== undefined) filters.push(Prisma.sql`cp.total_followers <= ${args.maxFollowers}`);
    if (args.minEngagement !== undefined) filters.push(Prisma.sql`cp.avg_engagement_rate >= ${args.minEngagement}`);
    if (args.maxEngagement !== undefined) filters.push(Prisma.sql`cp.avg_engagement_rate <= ${args.maxEngagement}`);
    if (args.minRate !== undefined) filters.push(Prisma.sql`cp.base_rate_cents >= ${args.minRate}`);
    if (args.maxRate !== undefined) filters.push(Prisma.sql`cp.base_rate_cents <= ${args.maxRate}`);
    if (args.isAvailable !== undefined) filters.push(Prisma.sql`cp.is_available = ${args.isAvailable}`);

    const whereSql = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    const orderColumn = ((): Prisma.Sql => {
      switch (args.sortBy) {
        case 'totalFollowers':
          return Prisma.sql`cp.total_followers`;
        case 'avgEngagementRate':
          return Prisma.sql`cp.avg_engagement_rate`;
        case 'avgRating':
          return Prisma.sql`cp.avg_rating`;
        case 'baseRateCents':
          return Prisma.sql`cp.base_rate_cents`;
        case 'distance':
        default:
          return Prisma.sql`distance_miles`;
      }
    })();
    const orderDir = args.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const idsAndDistances = await prisma.$queryRaw<RawCreatorRow[]>(Prisma.sql`
      SELECT
        cp.id,
        ST_Distance(cp.location::geography, ${point}) / 1609.344 AS distance_miles
      FROM creator_profiles cp
      INNER JOIN users u ON u.id = cp.user_id
      ${whereSql}
      ORDER BY ${orderColumn} ${orderDir} NULLS LAST
      LIMIT ${args.limit}
      OFFSET ${args.skip}
    `);

    const totalRow = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM creator_profiles cp
      INNER JOIN users u ON u.id = cp.user_id
      ${whereSql}
    `);
    const total = Number(totalRow[0]?.count ?? 0);

    if (idsAndDistances.length === 0) {
      return { creators: [], total };
    }

    const ids = idsAndDistances.map((r) => r.id);
    const distanceById = new Map(idsAndDistances.map((r) => [r.id, r.distance_miles]));

    const creators = await prisma.creatorProfile.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { avatarUrl: true } },
        socialAccounts: {
          where: { isConnected: true },
          select: { platform: true, username: true, followersCount: true, engagementRate: true },
        },
      },
    });

    // Preserve geo-ordered ranking (Prisma `findMany` order is not guaranteed).
    const byId = new Map(creators.map((c) => [c.id, c]));
    const ordered = ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));

    return {
      creators: ordered.map((creator) => ({
        ...this.formatPublicCreator(creator),
        avatarUrl: creator.user.avatarUrl || undefined,
        distanceMiles: distanceById.get(creator.id) ?? undefined,
        socialAccounts: this.formatPublicSocials(creator.socialAccounts, creator.id),
      })),
      total,
    };
  }

  async getById(id: string): Promise<CreatorWithDistance> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            avatarUrl: true,
            // NOTE: email is intentionally excluded — `getById` is reachable
            // via the public `GET /creators/:id` route.
          },
        },
        socialAccounts: { where: { isConnected: true } },
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
      ...this.formatPublicCreator(creator),
      avatarUrl: creator.user.avatarUrl || undefined,
      socialAccounts: creator.socialAccounts.map((sa) => this.formatSocialAccount(sa)),
      portfolioItems: creator.portfolioItems.map((pi) => this.formatPortfolioItem(pi)),
    };
  }

  /**
   * Authenticated own-profile fetch. Includes private fields
   * (Stripe account ID, onboarding status) that are stripped from the public
   * `getById` formatter.
   */
  async getByUserId(userId: string): Promise<CreatorProfile & {
    stripeAccountId?: string;
    stripeOnboardingComplete: boolean;
  }> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    return {
      ...this.formatPublicCreator(creator),
      stripeAccountId: creator.stripeAccountId || undefined,
      stripeOnboardingComplete: creator.stripeOnboardingComplete,
    };
  }

  async update(userId: string, input: UpdateCreatorInput): Promise<CreatorProfile> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    const completeness = this.calculateProfileCompleteness({ ...creator, ...input });

    // If any field that affects match scoring changed, drop cached match
    // scores so businesses see fresh recommendations on next read.
    const shouldInvalidateMatches = Object.keys(input).some((k) =>
      MATCH_INVALIDATING_FIELDS.has(k)
    );

    const [updated] = await prisma.$transaction([
      prisma.creatorProfile.update({
        where: { userId },
        data: {
          ...input,
          profileCompleteness: completeness,
        },
      }),
      ...(shouldInvalidateMatches
        ? [prisma.matchScore.deleteMany({ where: { creatorId: creator.id } })]
        : []),
    ]);

    return this.formatPublicCreator(updated);
  }

  /**
   * Creates (or reuses) a Stripe Connect Express account for the creator and
   * returns a one-time hosted onboarding URL that expires after a few minutes.
   */
  async createStripeOnboardingLink(userId: string): Promise<{ url: string }> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    let accountId = creator.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: creator.user.email,
        metadata: { creatorId: creator.id },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: {
          stripeAccountId: accountId,
          stripeAccountStatus: 'incomplete',
          stripeOnboardingComplete: false,
        },
      });
      logger.info(`Created Stripe Connect account ${accountId} for creator ${creator.id}`);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${env.APP_URL}/dashboard/settings?stripe=refresh`,
      return_url: `${env.APP_URL}/dashboard/settings?stripe=complete`,
      type: 'account_onboarding',
    });

    return { url: link.url };
  }

  async getStripeDashboardLink(userId: string): Promise<{ url: string }> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

    if (!creator.stripeAccountId) {
      throw new AppError(
        ErrorCodes.NOT_FOUND,
        'No Stripe account found — complete onboarding first',
        404
      );
    }

    const link = await stripe.accounts.createLoginLink(creator.stripeAccountId);
    return { url: link.url };
  }

  async addPortfolioItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItem> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Creator profile not found', 404);
    }

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

  private formatPublicSocials(
    accounts: Array<{ platform: string; username: string | null; followersCount: number; engagementRate: number }>,
    creatorId: string
  ) {
    return accounts.map((sa) => ({
      id: '',
      creatorId,
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
    }));
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

  /**
   * Public formatter — never includes `email`, `stripeAccountId`, or any
   * other private field. Used for both unauthenticated `/creators/:id` and
   * the public search list.
   */
  private formatPublicCreator(creator: any): CreatorProfile {
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
      stripeOnboardingComplete: Boolean(creator.stripeOnboardingComplete),
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
