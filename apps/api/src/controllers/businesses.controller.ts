import { Request, Response, NextFunction } from 'express';
import { businessService } from '../services/business.service';
import { sendSuccess } from '../utils/response';
import { UpdateBusinessInput, SubscriptionCheckoutInput } from '../validators/business.validator';

export class BusinessesController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const business = await businessService.getById(id);

      sendSuccess(res, business);
    } catch (error) {
      next(error);
    }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const business = await businessService.getByUserId(userId);

      sendSuccess(res, business);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: UpdateBusinessInput = req.body;
      const business = await businessService.update(userId, input);

      sendSuccess(res, business);
    } catch (error) {
      next(error);
    }
  }

  async createSubscriptionCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const input: SubscriptionCheckoutInput = req.body;
      const result = await businessService.createSubscriptionCheckout(userId, input);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const subscription = await businessService.getSubscription(userId);

      sendSuccess(res, subscription);
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      await businessService.cancelSubscription(userId);

      sendSuccess(res, { message: 'Subscription will be canceled at the end of the billing period' });
    } catch (error) {
      next(error);
    }
  }

  async resumeSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      await businessService.resumeSubscription(userId);

      sendSuccess(res, { message: 'Subscription resumed' });
    } catch (error) {
      next(error);
    }
  }
}

export const businessesController = new BusinessesController();
