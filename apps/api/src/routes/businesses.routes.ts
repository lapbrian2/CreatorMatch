import { Router } from 'express';
import { businessesController } from '../controllers/businesses.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate, requireBusiness } from '../middleware/auth.middleware';
import {
  updateBusinessValidator,
  subscriptionCheckoutValidator,
} from '../validators/business.validator';

const router = Router();

// Public routes
router.get('/:id', (req, res, next) => businessesController.getById(req, res, next));

// Protected routes (business only)
router.get('/me/profile', authenticate, requireBusiness, (req, res, next) =>
  businessesController.getMyProfile(req, res, next)
);

router.patch(
  '/me/profile',
  authenticate,
  requireBusiness,
  validateBody(updateBusinessValidator),
  (req, res, next) => businessesController.update(req, res, next)
);

// Subscription management
router.post(
  '/me/subscription/checkout',
  authenticate,
  requireBusiness,
  validateBody(subscriptionCheckoutValidator),
  (req, res, next) => businessesController.createSubscriptionCheckout(req, res, next)
);

router.get('/me/subscription', authenticate, requireBusiness, (req, res, next) =>
  businessesController.getSubscription(req, res, next)
);

router.post('/me/subscription/cancel', authenticate, requireBusiness, (req, res, next) =>
  businessesController.cancelSubscription(req, res, next)
);

router.post('/me/subscription/resume', authenticate, requireBusiness, (req, res, next) =>
  businessesController.resumeSubscription(req, res, next)
);

export default router;
