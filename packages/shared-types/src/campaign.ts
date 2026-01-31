import { Location, NicheCategory } from './creator';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'canceled';

export type ContentType =
  | 'instagram_post'
  | 'instagram_story'
  | 'instagram_reel'
  | 'tiktok_video'
  | 'youtube_video'
  | 'blog_post'
  | 'other';

export interface Deliverable {
  type: ContentType;
  quantity: number;
  description?: string;
}

export interface Campaign {
  id: string;
  businessId: string;
  title: string;
  description?: string;
  objective?: string;
  requiredContentTypes: ContentType[];
  requiredDeliverables: Deliverable[];
  brandGuidelines?: string;
  hashtags: string[];
  mentions: string[];
  targetNiches: NicheCategory[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  targetLocation?: Location;
  targetRadiusMiles: number;
  budgetCents: number;
  paymentPerCreatorCents?: number;
  maxCreators: number;
  startDate?: string;
  endDate?: string;
  contentDeadline?: string;
  status: CampaignStatus;
  invitedCount: number;
  appliedCount: number;
  acceptedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCreateRequest {
  title: string;
  description?: string;
  objective?: string;
  requiredContentTypes: ContentType[];
  requiredDeliverables: Deliverable[];
  brandGuidelines?: string;
  hashtags?: string[];
  mentions?: string[];
  targetNiches?: NicheCategory[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  targetLat?: number;
  targetLng?: number;
  targetRadiusMiles?: number;
  budgetCents: number;
  paymentPerCreatorCents?: number;
  maxCreators?: number;
  startDate?: string;
  endDate?: string;
  contentDeadline?: string;
}

export interface MatchScore {
  id: string;
  campaignId: string;
  creatorId: string;
  overallScore: number;
  nicheScore: number;
  locationScore: number;
  engagementScore: number;
  followerScore: number;
  priceScore: number;
  availabilityScore: number;
  historyScore: number;
  matchReasoning: MatchReasoning;
  isRecommended: boolean;
  wasInvited: boolean;
  wasViewed: boolean;
  calculatedAt: string;
}

export interface MatchReasoning {
  strengths: string[];
  considerations: string[];
}

export interface MatchWithCreator extends MatchScore {
  creator: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    city?: string;
    state?: string;
    niches: NicheCategory[];
    totalFollowers: number;
    avgEngagementRate: number;
    baseRateCents?: number;
  };
}
