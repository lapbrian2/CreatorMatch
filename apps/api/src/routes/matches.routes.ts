import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller';
import { authenticate, requireBusiness } from '../middleware/auth.middleware';

const router = Router();

// All routes require business authentication
router.use(authenticate, requireBusiness);

router.get('/campaign/:campaignId', (req, res, next) =>
  matchesController.getForCampaign(req, res, next)
);

router.post('/campaign/:campaignId/calculate', (req, res, next) =>
  matchesController.calculate(req, res, next)
);

router.get('/:matchId', (req, res, next) => matchesController.getById(req, res, next));

export default router;
