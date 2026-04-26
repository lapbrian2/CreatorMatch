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

export class MatchService {
  async calculateForCampaign(campaignId: string, userId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
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

    // Find eligible creators
    const creators = await prisma.creatorProfile.findMany({
      where: {
        isAvailable: true,
        user: { isActive: true },
        // Add niche overlap filter if campaign has target niches
        ...(campaign.targetNiches.length > 0 && {
          niches: { hasSome: campaign.targetNiches },
        }),
      },
      take: 500, // Limit for performance
    });

    // Calculate scores for each creator
    const matchScores = await Promise.all(
      creators.map(async (creator) => {
        const factors = await this.calculateFactors(campaign, creator);
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
      })
    );

    // Upsert match scores
    for (const score of matchScores) {
      await prisma.matchScore.upsert({
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
      });
    }
  }

  async getForCampaign(
    campaignId: string,
    userId: string,
    minScore = 0
  ): Promise<MatchWithCreator[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
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

    const matches = await prisma.matchScore.findMany({
      where: {
        campaignId,
        overallScore: { gte: minScore },
      },
      include: {
        creator: {
          include: {
            user: {
              select: { avatarUrl: true },
            },
          },
        },
      },
      orderBy: { overallScore: 'desc' },
      take: 100,
    });

    return matches.map((m) => this.formatMatchWithCreator(m));
  }

  async getById(matchId: string): Promise<MatchScore> {
    const match = await prisma.matchScore.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Match not found', 404);
    }

    return this.formatMatch(match);
  }

  private async calculateFactors(campaign: any, creator: any): Promise<MatchFactors> {
    return {
      nicheScore: this.calculateNicheScore(campaign.targetNiches, creator.niches),
      locationScore: this.calculateLocationScore(campaign, creator),
      engagementScore: this.calculateEngagementScore(campaign, creator),
      followerScore: this.calculateFollowerScore(campaign, creator),
      priceScore: this.calculatePriceScore(campaign, creator),
      availabilityScore: this.calculateAvailabilityScore(creator),
      historyScore: await this.calculateHistoryScore(creator),
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

  private calculateNicheScore(campaignNiches: NicheCategory[], creatorNiches: NicheCategory[]): number {
    if (!campaignNiches || campaignNiches.length === 0) return 100;
    if (!creatorNiches || creatorNiches.length === 0) return 0;

    const matches = creatorNiches.filter((n) => campaignNiches.includes(n));
    const matchRatio = matches.length / campaignNiches.length;

    // Primary match (first niche) gets bonus
    const primaryMatch = creatorNiches[0] && campaignNiches.includes(creatorNiches[0]);
    const bonus = primaryMatch ? 10 : 0;

    return Math.min(100, Math.round(matchRatio * 90 + bonus));
  }

  private calculateLocationScore(campaign: any, creator: any): number {
    if (!campaign.targetLatitude || !campaign.targetLongitude) return 100;
    if (!creator.latitude || !creator.longitude) return 50;

    const distance = this.calculateDistance(
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

  private calculateEngagementScore(campaign: any, creator: any): number {
    const minRequired = campaign.minEngagementRate || 0;
    const creatorRate = creator.avgEngagementRate || 0;

    if (creatorRate >= minRequired * 2) return 100;
    if (creatorRate >= minRequired * 1.5) return 90;
    if (creatorRate >= minRequired) return 75;
    if (creatorRate >= minRequired * 0.8) return 50;
    if (creatorRate >= minRequired * 0.5) return 25;
    return 0;
  }

  private calculateFollowerScore(campaign: any, creator: any): number {
    const minFollowers = campaign.minFollowers || 0;
    const maxFollowers = campaign.maxFollowers || Infinity;
    const creatorFollowers = creator.totalFollowers || 0;

    if (minFollowers <= creatorFollowers && creatorFollowers <= maxFollowers) {
      const range = maxFollowers - minFollowers;
      if (range === Infinity || range === 0) return 100;

      const position = creatorFollowers - minFollowers;
      const percentile = position / range;

      if (percentile >= 0.3 && percentile <= 0.7) return 100;
      if (percentile >= 0.2 && percentile <= 0.8) return 90;
      return 75;
    }

    if (creatorFollowers < minFollowers) {
      const deficit = (minFollowers - creatorFollowers) / minFollowers;
      return Math.max(0, Math.round(60 - deficit * 100));
    }

    const excess = (creatorFollowers - maxFollowers) / maxFollowers;
    return Math.max(0, Math.round(60 - excess * 50));
  }

  private calculatePriceScore(campaign: any, creator: any): number {
    if (!creator.baseRateCents) return 80;

    const budgetPerCreator = campaign.paymentPerCreatorCents || campaign.budgetCents;
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

  private async calculateHistoryScore(creator: any): Promise<number> {
    const deals = await prisma.deal.findMany({
      where: { creatorId: creator.id },
      select: { status: true },
    });

    if (deals.length === 0) return 70; // Neutral for new creators

    const completed = deals.filter((d) => d.status === 'completed').length;
    const canceled = deals.filter((d) => d.status === 'canceled').length;
    const total = completed + canceled;

    if (total === 0) return 70;

    const completionRate = completed / total;

    // Get average rating
    const avgRating = creator.avgRating || 0;
    const ratingScore = avgRating > 0 ? (avgRating / 5) * 100 : 70;

    return Math.round(completionRate * 50 + ratingScore * 0.5);
  }

  private generateReasoning(factors: MatchFactors, campaign: any, creator: any): MatchReasoning {
    const strengths: string[] = [];
    const considerations: string[] = [];

    if (factors.nicheScore >= 80) {
      strengths.push(`Strong niche alignment with ${campaign.targetNiches?.length || 0} matching categories`);
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

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
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

export const matchService = new MatchService();
