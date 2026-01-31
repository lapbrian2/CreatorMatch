import { z } from 'zod';
import { dealSchema, paginationSchema } from '@creatormatch/shared-utils';

export const createDealValidator = dealSchema;

export const dealListValidator = paginationSchema.extend({
  status: z
    .enum(['pending', 'accepted', 'in_progress', 'content_submitted', 'approved', 'completed', 'disputed', 'canceled'])
    .optional(),
});

export const submissionValidator = z.object({
  contentType: z.enum([
    'instagram_post',
    'instagram_story',
    'instagram_reel',
    'tiktok_video',
    'youtube_video',
    'blog_post',
    'other',
  ]),
  contentUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(5000).optional(),
  platformPostUrl: z.string().url().optional(),
});

export type CreateDealInput = z.infer<typeof createDealValidator>;
export type DealListInput = z.infer<typeof dealListValidator>;
export type SubmissionInput = z.infer<typeof submissionValidator>;
