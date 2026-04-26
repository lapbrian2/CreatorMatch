import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { matchService } from '../services/match.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { logger } from '../utils/logger';
import { CreateCampaignInput, UpdateCampaignInput, CampaignListInput } from '../validators/campaign.validator';

export class CampaignsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: CreateCampaignInput = req.body;
      const campaign = await campaignService.create(userId, input);

      sendSuccess(res, campaign, 201);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const filters: CampaignListInput = req.query as any;
      const { campaigns, total } = await campaignService.list(userId, filters);

      sendPaginated(res, campaigns, total, filters.page || 1, filters.limit || 20);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const campaign = await campaignService.getById(id, userId);

      sendSuccess(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const input: UpdateCampaignInput = req.body;
      const campaign = await campaignService.update(id, userId, input);

      sendSuccess(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  async launch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const campaign = await campaignService.launch(id, userId);

      // Match calculation is fan-out heavy (up to 500 candidates, all upserts).
      // We respond 202 immediately and run the calculation in the background
      // so the request thread isn't held open past gateway timeouts. Clients
      // refresh /matches/campaign/:id once the work completes (poll or websocket).
      setImmediate(() => {
        matchService.calculateForCampaign(id, userId).catch((err) => {
          logger.error(`Background match calculation failed for campaign ${id}:`, err);
        });
      });

      sendSuccess(res, campaign, 202);
    } catch (error) {
      next(error);
    }
  }

  async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const campaign = await campaignService.pause(id, userId);

      sendSuccess(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const campaign = await campaignService.resume(id, userId);

      sendSuccess(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      await campaignService.delete(id, userId);

      sendSuccess(res, { message: 'Campaign deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignsController = new CampaignsController();
