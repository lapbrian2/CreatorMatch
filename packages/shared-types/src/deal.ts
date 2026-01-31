import { ContentType, Deliverable } from './campaign';

export type DealStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'content_submitted'
  | 'approved'
  | 'completed'
  | 'disputed'
  | 'canceled';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface DealDeliverable extends Deliverable {
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested';
  deadline?: string;
}

export interface Deal {
  id: string;
  campaignId: string;
  businessId: string;
  creatorId: string;
  agreedAmountCents: number;
  platformFeeCents: number;
  creatorPayoutCents: number;
  deliverables: DealDeliverable[];
  specialRequirements?: string;
  status: DealStatus;
  proposedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  contentSubmittedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  canceledBy?: string;
  cancellationReason?: string;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  paidAt?: string;
  businessNotes?: string;
  creatorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealSubmission {
  id: string;
  dealId: string;
  contentType: ContentType;
  contentUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  reach?: number;
  impressions?: number;
  status: 'submitted' | 'approved' | 'revision_requested' | 'rejected';
  revisionNotes?: string;
  submittedAt: string;
  approvedAt?: string;
}

export interface DealCreateRequest {
  campaignId: string;
  creatorId: string;
  agreedAmountCents: number;
  deliverables: DealDeliverable[];
  specialRequirements?: string;
  businessNotes?: string;
}

export interface DealWithParties extends Deal {
  campaign: {
    id: string;
    title: string;
    businessId: string;
  };
  business: {
    id: string;
    businessName: string;
    logoUrl?: string;
  };
  creator: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface Review {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  title?: string;
  content?: string;
  communicationRating?: number;
  qualityRating?: number;
  timelinessRating?: number;
  professionalismRating?: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
