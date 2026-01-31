import { z } from 'zod';
import { creatorProfileSchema, paginationSchema, nicheCategorySchema } from '@creatormatch/shared-utils';

export const updateCreatorValidator = creatorProfileSchema.partial();

export const creatorSearchValidator = paginationSchema.extend({
  niches: z.string().transform((s) => s.split(',').filter(Boolean)).optional(),
  minFollowers: z.coerce.number().int().min(0).optional(),
  maxFollowers: z.coerce.number().int().min(0).optional(),
  minEngagement: z.coerce.number().min(0).max(100).optional(),
  maxEngagement: z.coerce.number().min(0).max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMiles: z.coerce.number().int().min(1).max(500).default(25),
  minRate: z.coerce.number().int().min(0).optional(),
  maxRate: z.coerce.number().int().min(0).optional(),
  isAvailable: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const portfolioItemValidator = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  mediaType: z.enum(['image', 'video', 'link']),
  mediaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  externalLink: z.string().url().optional(),
  platform: z.string().max(50).optional(),
  brandName: z.string().max(255).optional(),
  isFeatured: z.boolean().default(false),
});

export const geoBoundsValidator = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
});

export type UpdateCreatorInput = z.infer<typeof updateCreatorValidator>;
export type CreatorSearchInput = z.infer<typeof creatorSearchValidator>;
export type PortfolioItemInput = z.infer<typeof portfolioItemValidator>;
