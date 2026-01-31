import { Router } from 'express';
import { campaignsController } from '../controllers/campaigns.controller';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate, requireBusiness } from '../middleware/auth.middleware';
import {
  createCampaignValidator,
  updateCampaignValidator,
  campaignListValidator,
} from '../validators/campaign.validator';

const router = Router();

// All routes require business authentication
router.use(authenticate, requireBusiness);

router.post('/', validateBody(createCampaignValidator), (req, res, next) =>
  campaignsController.create(req, res, next)
);

router.get('/', validateQuery(campaignListValidator), (req, res, next) =>
  campaignsController.list(req, res, next)
);

router.get('/:id', (req, res, next) => campaignsController.getById(req, res, next));

router.patch('/:id', validateBody(updateCampaignValidator), (req, res, next) =>
  campaignsController.update(req, res, next)
);

router.post('/:id/launch', (req, res, next) => campaignsController.launch(req, res, next));

router.post('/:id/pause', (req, res, next) => campaignsController.pause(req, res, next));

router.post('/:id/resume', (req, res, next) => campaignsController.resume(req, res, next));

router.delete('/:id', (req, res, next) => campaignsController.delete(req, res, next));

export default router;
