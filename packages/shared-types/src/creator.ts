export type NicheCategory =
  | 'food'
  | 'fashion'
  | 'beauty'
  | 'fitness'
  | 'travel'
  | 'lifestyle'
  | 'tech'
  | 'gaming'
  | 'parenting'
  | 'pets'
  | 'home_decor'
  | 'automotive'
  | 'entertainment'
  | 'education'
  | 'other';

export interface Location {
  lat: number;
  lng: number;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  headline?: string;
  avatarUrl?: string;
  location?: Location;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  serviceRadiusMiles: number;
  niches: NicheCategory[];
  websiteUrl?: string;
  baseRateCents?: number;
  ratePerPostCents?: number;
  ratePerStoryCents?: number;
  ratePerReelCents?: number;
  totalFollowers: number;
  avgEngagementRate: number;
  completedDealsCount: number;
  avgRating: number;
  reviewCount: number;
  profileCompleteness: number;
  isVerified: boolean;
  isAvailable: boolean;
  stripeOnboardingComplete: boolean;
  // NOTE: `stripeAccountId` was intentionally removed from the shared
  // public type — the connect account ID is private. The own-profile
  // endpoint returns it via a separate richer shape in the API service.
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccount {
  id: string;
  creatorId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  profileUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  audienceDemographics?: Record<string, unknown>;
  lastSyncedAt?: string;
  isPrimary: boolean;
  isConnected: boolean;
}

export interface PortfolioItem {
  id: string;
  creatorId: string;
  title?: string;
  description?: string;
  mediaType: 'image' | 'video' | 'link';
  mediaUrl: string;
  thumbnailUrl?: string;
  externalLink?: string;
  platform?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  brandName?: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CreatorSearchFilters {
  niches?: NicheCategory[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  minRate?: number;
  maxRate?: number;
  isAvailable?: boolean;
}

export interface CreatorWithDistance extends CreatorProfile {
  distanceMiles?: number;
  socialAccounts?: SocialAccount[];
  portfolioItems?: PortfolioItem[];
}
