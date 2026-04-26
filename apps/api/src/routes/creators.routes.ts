import { Router } from 'express';
import { creatorsController } from '../controllers/creators.controller';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate, optionalAuth, requireCreator } from '../middleware/auth.middleware';
import { authLimiter, strictLimiter } from '../middleware/rateLimit.middleware';
import {
  creatorSearchValidator,
  updateCreatorValidator,
  portfolioItemValidator,
} from '../validators/creator.validator';

const router = Router();

// Public — search is unauthenticated and CPU-heavy when geo-filtered, so
// throttle aggressively per-IP on top of the global limiter.
router.get('/', strictLimiter, validateQuery(creatorSearchValidator), (req, res, next) =>
  creatorsController.search(req, res, next)
);

router.get('/:id', optionalAuth, (req, res, next) =>
  creatorsController.getById(req, res, next)
);

router.get('/:id/portfolio', (req, res, next) =>
  creatorsController.getPortfolio(req, res, next)
);

// Protected — creator only.
router.get('/me/profile', authenticate, requireCreator, (req, res, next) =>
  creatorsController.getMyProfile(req, res, next)
);

router.patch(
  '/me/profile',
  authenticate,
  requireCreator,
  validateBody(updateCreatorValidator),
  (req, res, next) => creatorsController.update(req, res, next)
);

router.post(
  '/me/portfolio',
  authenticate,
  requireCreator,
  validateBody(portfolioItemValidator),
  (req, res, next) => creatorsController.addPortfolioItem(req, res, next)
);

router.delete('/me/portfolio/:itemId', authenticate, requireCreator, (req, res, next) =>
  creatorsController.removePortfolioItem(req, res, next)
);

// Stripe Connect onboarding — produces a hosted onboarding URL the creator
// completes once. The webhook (`account.updated`) flips
// `stripeOnboardingComplete` once Stripe verifies identity + payout method.
router.post('/me/stripe/onboard', authLimiter, authenticate, requireCreator, (req, res, next) =>
  creatorsController.stripeOnboard(req, res, next)
);

router.post('/me/stripe/dashboard', authenticate, requireCreator, (req, res, next) =>
  creatorsController.stripeDashboard(req, res, next)
);

export default router;
