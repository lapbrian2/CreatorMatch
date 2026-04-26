import { Request, Response, NextFunction } from 'express';
import { creatorService } from '../services/creator.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { CreatorSearchInput, UpdateCreatorInput, PortfolioItemInput } from '../validators/creator.validator';

export class CreatorsController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: CreatorSearchInput = req.query as any;
      const { creators, total } = await creatorService.search(filters);

      sendPaginated(res, creators, total, filters.page || 1, filters.limit || 20);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const creator = await creatorService.getById(id);

      sendSuccess(res, creator);
    } catch (error) {
      next(error);
    }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const creator = await creatorService.getByUserId(userId);

      sendSuccess(res, creator);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: UpdateCreatorInput = req.body;
      const creator = await creatorService.update(userId, input);

      sendSuccess(res, creator);
    } catch (error) {
      next(error);
    }
  }

  async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const items = await creatorService.getPortfolio(id);

      sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  async addPortfolioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: PortfolioItemInput = req.body;
      const item = await creatorService.addPortfolioItem(userId, input);

      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  }

  async removePortfolioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { itemId } = req.params;
      await creatorService.removePortfolioItem(userId, itemId);

      sendSuccess(res, { message: 'Portfolio item removed' });
    } catch (error) {
      next(error);
    }
  }
}

export const creatorsController = new CreatorsController();
