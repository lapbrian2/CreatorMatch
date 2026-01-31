import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

export const urlSchema = z.string().url('Invalid URL').optional();

export const uuidSchema = z.string().uuid('Invalid ID format');

export const nicheCategories = [
  'food',
  'fashion',
  'beauty',
  'fitness',
  'travel',
  'lifestyle',
  'tech',
  'gaming',
  'parenting',
  'pets',
  'home_decor',
  'automotive',
  'entertainment',
  'education',
  'other',
] as const;

export const nicheCategorySchema = z.enum(nicheCategories);

export const contentTypes = [
  'instagram_post',
  'instagram_story',
  'instagram_reel',
  'tiktok_video',
  'youtube_video',
  'blog_post',
  'other',
] as const;

export const contentTypeSchema = z.enum(contentTypes);

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['creator', 'business']),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const creatorProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(1000).optional(),
  headline: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  serviceRadiusMiles: z.number().int().min(1).max(500).default(25),
  niches: z.array(nicheCategorySchema).max(5).default([]),
  websiteUrl: urlSchema,
  baseRateCents: z.number().int().min(0).optional(),
  ratePerPostCents: z.number().int().min(0).optional(),
  ratePerStoryCents: z.number().int().min(0).optional(),
  ratePerReelCents: z.number().int().min(0).optional(),
  isAvailable: z.boolean().default(true),
});

export const businessProfileSchema = z.object({
  businessName: z.string().min(1).max(255),
  businessType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  targetNiches: z.array(nicheCategorySchema).max(10).default([]),
  preferredFollowerMin: z.number().int().min(0).optional(),
  preferredFollowerMax: z.number().int().min(0).optional(),
  preferredEngagementMin: z.number().min(0).max(100).optional(),
  websiteUrl: urlSchema,
  instagramUrl: urlSchema,
  contactEmail: emailSchema.optional(),
  contactPhone: phoneSchema,
});

export const campaignSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  objective: z.string().max(1000).optional(),
  requiredContentTypes: z.array(contentTypeSchema).min(1),
  requiredDeliverables: z.array(
    z.object({
      type: contentTypeSchema,
      quantity: z.number().int().min(1).max(100),
      description: z.string().max(500).optional(),
    })
  ),
  brandGuidelines: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(100)).max(20).default([]),
  mentions: z.array(z.string().max(100)).max(10).default([]),
  targetNiches: z.array(nicheCategorySchema).max(5).default([]),
  minFollowers: z.number().int().min(0).optional(),
  maxFollowers: z.number().int().min(0).optional(),
  minEngagementRate: z.number().min(0).max(100).optional(),
  targetLat: z.number().min(-90).max(90).optional(),
  targetLng: z.number().min(-180).max(180).optional(),
  targetRadiusMiles: z.number().int().min(1).max(500).default(25),
  budgetCents: z.number().int().min(100),
  paymentPerCreatorCents: z.number().int().min(100).optional(),
  maxCreators: z.number().int().min(1).max(100).default(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  contentDeadline: z.string().datetime().optional(),
});

export const dealSchema = z.object({
  campaignId: uuidSchema,
  creatorId: uuidSchema,
  agreedAmountCents: z.number().int().min(100),
  deliverables: z.array(
    z.object({
      type: contentTypeSchema,
      quantity: z.number().int().min(1),
      description: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'submitted', 'approved', 'revision_requested']).default('pending'),
      deadline: z.string().datetime().optional(),
    })
  ),
  specialRequirements: z.string().max(2000).optional(),
  businessNotes: z.string().max(1000).optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachmentUrl: urlSchema,
  attachmentType: z.string().max(50).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().max(2000).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
  professionalismRating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().default(true),
});
