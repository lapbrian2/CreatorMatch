import { Request, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { sendSuccess } from '../utils/response';

export class MatchesController {
  async getForCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { campaignId } = req.params;
      const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : 0;

      const matches = await matchService.getForCampaign(campaignId, userId, minScore);

      sendSuccess(res, matches);
    } catch (error) {
      next(error);
    }
  }

  async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { campaignId } = req.params;

      await matchService.calculateForCampaign(campaignId, userId);

      sendSuccess(res, { message: 'Matches calculated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const match = await matchService.getById(matchId);

      sendSuccess(res, match);
    } catch (error) {
      next(error);
    }
  }
}

export const matchesController = new MatchesController();
