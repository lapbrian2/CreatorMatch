import { Request, Response, NextFunction } from 'express';
import { dealService } from '../services/deal.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { CreateDealInput, DealListInput, SubmissionInput } from '../validators/deal.validator';

export class DealsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: CreateDealInput = req.body;
      const deal = await dealService.create(userId, input);

      sendSuccess(res, deal, 201);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const role = req.user!.role;
      const filters: DealListInput = req.query as any;
      const { deals, total } = await dealService.list(userId, role, filters);

      sendPaginated(res, deals, total, filters.page || 1, filters.limit || 20);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const deal = await dealService.getById(id, userId);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const deal = await dealService.accept(id, userId);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const { reason } = req.body;
      const deal = await dealService.reject(id, userId, reason);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const deal = await dealService.start(id, userId);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const input: SubmissionInput = req.body;
      const submission = await dealService.submitContent(id, userId, input);

      sendSuccess(res, submission, 201);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const deal = await dealService.approve(id, userId);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async requestRevision(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const { notes } = req.body;
      const deal = await dealService.requestRevision(id, userId, notes);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const deal = await dealService.complete(id, userId);

      sendSuccess(res, deal);
    } catch (error) {
      next(error);
    }
  }

  async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const submissions = await dealService.getSubmissions(id, userId);

      sendSuccess(res, submissions);
    } catch (error) {
      next(error);
    }
  }
}

export const dealsController = new DealsController();
