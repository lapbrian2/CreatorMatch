import { Router } from 'express';
import { creatorsController } from '../controllers/creators.controller';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate, optionalAuth, requireCreator } from '../middleware/auth.middleware';
import {
  creatorSearchValidator,
  updateCreatorValidator,
  portfolioItemValidator,
} from '../validators/creator.validator';

const router = Router();

// Public routes
router.get('/', validateQuery(creatorSearchValidator), (req, res, next) =>
  creatorsController.search(req, res, next)
);

router.get('/:id', optionalAuth, (req, res, next) =>
  creatorsController.getById(req, res, next)
);

router.get('/:id/portfolio', (req, res, next) =>
  creatorsController.getPortfolio(req, res, next)
);

// Protected routes (creator only)
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

export default router;
