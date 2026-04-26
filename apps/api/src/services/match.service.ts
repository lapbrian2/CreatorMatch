import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/response';
import { MatchScore, MatchWithCreator, MatchReasoning, NicheCategory } from '@creatormatch/shared-types';
import { MATCH_WEIGHTS } from '@creatormatch/shared-utils';

interface MatchFactors {
  nicheScore: number;
  locationScore: number;
  engagementScore: number;
  followerScore: number;
  priceScore: number;
  availabilityScore: number;
  historyScore: number;
}

interface CreatorHistoryStats {
  completed: number;
  canceled: number;
  disputed: number;
}

const MAX_CANDIDATES = 500;

export class MatchService {
  /**
   * Calculates match scores for every eligible creator against a campaign.
   * Caller is responsible for verifying ownership (we still re-verify here
   * as a defense-in-depth check).
   *
   * Performance:
   *  - All deal stats pulled in a single `groupBy` (was: N+1 per creator).
   *  - Upserts batched in a $transaction so the campaign launch finishes
   *    in one round-trip instead of 500.
   */
  async calculateForCampaign(campaignId: string, userId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: { select: { userId: true } } },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }
    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const creators = await prisma.creatorProfile.findMany({
      where: {
        isAvailable: true,
        user: { isActive: true },
        ...(campaign.targetNiches.length > 0 && {
          niches: { hasSome: campaign.targetNiches },
        }),
      },
      take: MAX_CANDIDATES,
    });

    if (creators.length === 0) return;

    // Pull deal-history stats for all candidate creators in ONE query.
    const creatorIds = creators.map((c) => c.id);
    const historyMap = await this.loadHistoryStats(creatorIds);

    const matchScores = creators.map((creator) => {
      const factors = this.calculateFactors(campaign, creator, historyMap.get(creator.id));
      const overallScore = this.calculateOverallScore(factors);
      const reasoning = this.generateReasoning(factors, campaign, creator);

      return {
        campaignId,
        creatorId: creator.id,
        overallScore,
        ...factors,
        matchReasoning: reasoning,
        isRecommended: overallScore >= 70,
      };
    });

    // Upsert in chunks inside transactions so partial failures don't leave
    // half-calculated match scores in the DB.
    const CHUNK = 50;
    for (let i = 0; i < matchScores.length; i += CHUNK) {
      const chunk = matchScores.slice(i, i + CHUNK);
      await prisma.$transaction(
        chunk.map((score) =>
          prisma.matchScore.upsert({
            where: {
              campaignId_creatorId: {
                campaignId: score.campaignId,
                creatorId: score.creatorId,
              },
            },
            update: {
              overallScore: score.overallScore,
              nicheScore: score.nicheScore,
              locationScore: score.locationScore,
              engagementScore: score.engagementScore,
              followerScore: score.followerScore,
              priceScore: score.priceScore,
              availabilityScore: score.availabilityScore,
              historyScore: score.historyScore,
              matchReasoning: score.matchReasoning as any,
              isRecommended: score.isRecommended,
              calculatedAt: new Date(),
            },
            create: score as any,
          })
        )
      );
    }
  }

  async getForCampaign(
    campaignId: string,
    userId: string,
    minScore = 0
  ): Promise<MatchWithCreator[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: { select: { userId: true } } },
    });

    if (!campaign) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Campaign not found', 404);
    }
    if (campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const matches = await prisma.matchScore.findMany({
      where: { campaignId, overallScore: { gte: minScore } },
      include: {
        creator: {
          include: { user: { select: { avatarUrl: true } } },
        },
      },
      orderBy: { overallScore: 'desc' },
      take: 100,
    });

    return matches.map((m) => this.formatMatchWithCreator(m));
  }

  /**
   * Looks up a single match score, verifying that the requesting user owns
   * the campaign the match belongs to. Closes the IDOR — previously this
   * route returned any match by ID without ownership check.
   */
  async getById(matchId: string, userId: string): Promise<MatchScore> {
    const match = await prisma.matchScore.findUnique({
      where: { id: matchId },
      include: {
        campaign: { include: { business: { select: { userId: true } } } },
      },
    });

    if (!match) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Match not found', 404);
    }
    if (match.campaign.business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    return this.formatMatch(match);
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  private calculateFactors(
    campaign: any,
    creator: any,
    history?: CreatorHistoryStats
  ): MatchFactors {
    return {
      nicheScore: this.calculateNicheScore(campaign.targetNiches, creator.niches),
      locationScore: this.calculateLocationScore(campaign, creator),
      engagementScore: this.calculateEngagementScore(campaign, creator),
      followerScore: this.calculateFollowerScore(campaign, creator),
      priceScore: this.calculatePriceScore(campaign, creator),
      availabilityScore: this.calculateAvailabilityScore(creator),
      historyScore: this.calculateHistoryScore(creator, history),
    };
  }

  private calculateOverallScore(factors: MatchFactors): number {
    return Math.round(
      factors.nicheScore * MATCH_WEIGHTS.niche +
        factors.locationScore * MATCH_WEIGHTS.location +
        factors.engagementScore * MATCH_WEIGHTS.engagement +
        factors.followerScore * MATCH_WEIGHTS.follower +
        factors.priceScore * MATCH_WEIGHTS.price +
        factors.availabilityScore * MATCH_WEIGHTS.availability +
        factors.historyScore * MATCH_WEIGHTS.history
    );
  }

  private calculateNicheScore(
    campaignNiches: NicheCategory[],
    creatorNiches: NicheCategory[]
  ): number {
    if (!campaignNiches || campaignNiches.length === 0) return 100;
    if (!creatorNiches || creatorNiches.length === 0) return 0;

    const matches = creatorNiches.filter((n) => campaignNiches.includes(n));
    const matchRatio = matches.length / campaignNiches.length;

    const primaryMatch = creatorNiches[0] && campaignNiches.includes(creatorNiches[0]);
    const bonus = primaryMatch ? 10 : 0;

    return Math.min(100, Math.round(matchRatio * 90 + bonus));
  }

  private calculateLocationScore(campaign: any, creator: any): number {
    if (!campaign.targetLatitude || !campaign.targetLongitude) return 100;
    if (!creator.latitude || !creator.longitude) return 50;

    const distance = haversineMiles(
      campaign.targetLatitude,
      campaign.targetLongitude,
      creator.latitude,
      creator.longitude
    );

    const maxRadius = campaign.targetRadiusMiles || 25;

    if (distance <= maxRadius * 0.5) return 100;
    if (distance <= maxRadius) return 80;
    if (distance <= maxRadius * 1.5) return 60;
    if (distance <= maxRadius * 2) return 40;
    if (distance <= maxRadius * 3) return 20;
    return 0;
  }

  /**
   * Engagement score with sane behavior when the campaign sets no minimum:
   * fall back to industry-benchmark scoring (>3% excellent, 1–3% good,
   * <1% poor) so the 20% weight remains a real differentiator.
   */
  private calculateEngagementScore(campaign: any, creator: any): number {
    const minRequired = campaign.minEngagementRate ?? 0;
    const creatorRate = creator.avgEngagementRate ?? 0;

    if (minRequired <= 0) {
      // Industry benchmarks for follower-segmented engagement (rough but
      // useful — better than the previous "100 for everyone" behavior).
      if (creatorRate >= 6) return 100;
      if (creatorRate >= 3) return 85;
      if (creatorRate >= 1) return 65;
      if (creatorRate > 0) return 40;
      return 0;
    }

    if (creatorRate >= minRequired * 2) return 100;
    if (creatorRate >= minRequired * 1.5) return 90;
    if (creatorRate >= minRequired) return 75;
    if (creatorRate >= minRequired * 0.8) return 50;
    if (creatorRate >= minRequired * 0.5) return 25;
    return 0;
  }

  private calculateFollowerScore(campaign: any, creator: any): number {
    const minFollowers = Math.max(0, campaign.minFollowers ?? 0);
    const maxFollowers =
      campaign.maxFollowers !== null && campaign.maxFollowers !== undefined
        ? campaign.maxFollowers
        : Number.POSITIVE_INFINITY;
    const creatorFollowers = creator.totalFollowers ?? 0;

    // Guard against degenerate ranges — these used to produce NaN scores.
    if (minFollowers === 0 && maxFollowers === Number.POSITIVE_INFINITY) return 100;
    if (minFollowers >= maxFollowers && maxFollowers !== Number.POSITIVE_INFINITY) {
      return creatorFollowers >= minFollowers ? 100 : 0;
    }

    if (minFollowers <= creatorFollowers && creatorFollowers <= maxFollowers) {
      const range =
        maxFollowers === Number.POSITIVE_INFINITY ? 0 : maxFollowers - minFollowers;
      if (range === 0) return 100;

      const percentile = (creatorFollowers - minFollowers) / range;
      if (percentile >= 0.3 && percentile <= 0.7) return 100;
      if (percentile >= 0.2 && percentile <= 0.8) return 90;
      return 75;
    }

    if (creatorFollowers < minFollowers) {
      // minFollowers > 0 here (otherwise we'd be in-range above).
      const deficit = (minFollowers - creatorFollowers) / minFollowers;
      return Math.max(0, Math.round(60 - deficit * 100));
    }

    // Above maxFollowers — guaranteed maxFollowers is a finite number > 0
    // because the in-range check failed AND we returned early for unset max.
    if (maxFollowers === 0 || maxFollowers === Number.POSITIVE_INFINITY) return 60;
    const excess = (creatorFollowers - maxFollowers) / maxFollowers;
    return Math.max(0, Math.round(60 - excess * 50));
  }

  /**
   * Price compatibility. When a creator hasn't disclosed their rate we
   * return a neutral 50 (unknown), NOT 80 — rewarding missing data caused
   * silent rate-mismatch bugs.
   */
  private calculatePriceScore(campaign: any, creator: any): number {
    if (!creator.baseRateCents || creator.baseRateCents <= 0) return 50;

    const budgetPerCreator = campaign.paymentPerCreatorCents || campaign.budgetCents;
    if (!budgetPerCreator || budgetPerCreator <= 0) return 50;

    const creatorRate = creator.baseRateCents;

    if (creatorRate <= budgetPerCreator * 0.8) return 100;
    if (creatorRate <= budgetPerCreator) return 85;
    if (creatorRate <= budgetPerCreator * 1.2) return 60;
    if (creatorRate <= budgetPerCreator * 1.5) return 30;
    return 10;
  }

  private calculateAvailabilityScore(creator: any): number {
    return creator.isAvailable ? 100 : 0;
  }

  /**
   * History score — fixed weighting and only counts terminal states in the
   * denominator so creators with active in-progress deals aren't unfairly
   * penalized.
   *
   *   completionRate = completed / (completed + canceled + disputed)
   *
   * Score = 70 * completionRate + 30 * (rating / 5), with sane neutrals
   * for cold-start creators.
   */
  private calculateHistoryScore(creator: any, stats?: CreatorHistoryStats): number {
    const completed = stats?.completed ?? 0;
    const canceled = stats?.canceled ?? 0;
    const disputed = stats?.disputed ?? 0;
    const terminal = completed + canceled + disputed;

    // No terminal deals AND no rating — full cold-start, neutral 70.
    if (terminal === 0 && (creator.avgRating ?? 0) === 0) return 70;

    const completionRate = terminal === 0 ? 1 : completed / terminal;
    const ratingFraction = (creator.avgRating ?? 0) > 0 ? creator.avgRating / 5 : 0.7;

    return Math.round(completionRate * 70 + ratingFraction * 30);
  }

  /**
   * Pulls completed/canceled/disputed counts for every candidate creator in
   * a single grouped query — replaces what was an N+1 of `prisma.deal.findMany`
   * per creator (capable of exhausting the connection pool at 500 candidates).
   */
  private async loadHistoryStats(creatorIds: string[]): Promise<Map<string, CreatorHistoryStats>> {
    const rows = await prisma.deal.groupBy({
      by: ['creatorId', 'status'],
      where: {
        creatorId: { in: creatorIds },
        status: { in: ['completed', 'canceled', 'disputed'] },
      },
      _count: { _all: true },
    });

    const map = new Map<string, CreatorHistoryStats>();
    for (const row of rows) {
      const stats = map.get(row.creatorId) ?? { completed: 0, canceled: 0, disputed: 0 };
      const count = row._count._all;
      if (row.status === 'completed') stats.completed = count;
      else if (row.status === 'canceled') stats.canceled = count;
      else if (row.status === 'disputed') stats.disputed = count;
      map.set(row.creatorId, stats);
    }
    return map;
  }

  private generateReasoning(
    factors: MatchFactors,
    campaign: any,
    creator: any
  ): MatchReasoning {
    const strengths: string[] = [];
    const considerations: string[] = [];

    if (factors.nicheScore >= 80) {
      strengths.push(
        `Strong niche alignment with ${campaign.targetNiches?.length || 0} matching categories`
      );
    }
    if (factors.locationScore >= 80) {
      strengths.push(`Located within ${campaign.targetRadiusMiles || 25} miles of target area`);
    }
    if (factors.engagementScore >= 80) {
      strengths.push(`High engagement rate (${creator.avgEngagementRate?.toFixed(2) || 0}%)`);
    }
    if (factors.historyScore >= 80) {
      strengths.push('Excellent track record with high completion rate');
    }
    if (factors.followerScore >= 80) {
      strengths.push('Follower count in ideal range for campaign');
    }

    if (factors.priceScore < 60) {
      considerations.push("Creator's rates may exceed campaign budget");
    }
    if (factors.followerScore < 60) {
      considerations.push('Follower count outside preferred range');
    }
    if (factors.locationScore < 60 && campaign.targetLatitude) {
      considerations.push('Located outside target radius');
    }
    if (factors.nicheScore < 60 && campaign.targetNiches?.length > 0) {
      considerations.push('Limited niche overlap with campaign targets');
    }

    return { strengths, considerations };
  }

  private formatMatch(match: any): MatchScore {
    return {
      id: match.id,
      campaignId: match.campaignId,
      creatorId: match.creatorId,
      overallScore: match.overallScore,
      nicheScore: match.nicheScore,
      locationScore: match.locationScore,
      engagementScore: match.engagementScore,
      followerScore: match.followerScore,
      priceScore: match.priceScore,
      availabilityScore: match.availabilityScore,
      historyScore: match.historyScore,
      matchReasoning: match.matchReasoning as MatchReasoning,
      isRecommended: match.isRecommended,
      wasInvited: match.wasInvited,
      wasViewed: match.wasViewed,
      calculatedAt: match.calculatedAt.toISOString(),
    };
  }

  private formatMatchWithCreator(match: any): MatchWithCreator {
    return {
      ...this.formatMatch(match),
      creator: {
        id: match.creator.id,
        displayName: match.creator.displayName,
        avatarUrl: match.creator.user?.avatarUrl || undefined,
        city: match.creator.city || undefined,
        state: match.creator.state || undefined,
        niches: match.creator.niches,
        totalFollowers: match.creator.totalFollowers,
        avgEngagementRate: match.creator.avgEngagementRate,
        baseRateCents: match.creator.baseRateCents || undefined,
      },
    };
  }
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const matchService = new MatchService();
