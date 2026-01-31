import { z } from 'zod';
import { campaignSchema, paginationSchema } from '@creatormatch/shared-utils';

export const createCampaignValidator = campaignSchema;
export const updateCampaignValidator = campaignSchema.partial();

export const campaignListValidator = paginationSchema.extend({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'canceled']).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignValidator>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignValidator>;
export type CampaignListInput = z.infer<typeof campaignListValidator>;
