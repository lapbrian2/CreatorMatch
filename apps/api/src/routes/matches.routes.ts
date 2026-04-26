import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller';
import { authenticate, requireBusiness } from '../middleware/auth.middleware';
import { strictLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/campaign/:campaignId', (req, res, next) =>
  matchesController.getForCampaign(req, res, next)
);

// Match recalculation is fan-out heavy (groupBy + 500-row upsert chunks).
// Strict per-minute cap prevents a single business from pinning the DB.
router.post('/campaign/:campaignId/calculate', strictLimiter, (req, res, next) =>
  matchesController.calculate(req, res, next)
);

router.get('/:matchId', (req, res, next) => matchesController.getById(req, res, next));

export default router;
