import { Location, NicheCategory } from './creator';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  location?: Location;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  targetNiches: NicheCategory[];
  preferredFollowerMin?: number;
  preferredFollowerMax?: number;
  preferredEngagementMin?: number;
  websiteUrl?: string;
  instagramUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: string;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  trialEndsAt?: string;
  activeCampaignsCount: number;
  completedDealsCount: number;
  totalSpentCents: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionCheckoutRequest {
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionCheckoutResponse {
  checkoutUrl: string;
}
