import { Router } from 'express';
import { dealsController } from '../controllers/deals.controller';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate, requireBusiness, requireCreator } from '../middleware/auth.middleware';
import { createDealValidator, dealListValidator, submissionValidator } from '../validators/deal.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List deals (both roles)
router.get('/', validateQuery(dealListValidator), (req, res, next) =>
  dealsController.list(req, res, next)
);

// Create deal (business only)
router.post('/', requireBusiness, validateBody(createDealValidator), (req, res, next) =>
  dealsController.create(req, res, next)
);

// Get deal by ID
router.get('/:id', (req, res, next) => dealsController.getById(req, res, next));

// Creator actions
router.post('/:id/accept', requireCreator, (req, res, next) =>
  dealsController.accept(req, res, next)
);

router.post('/:id/reject', requireCreator, (req, res, next) =>
  dealsController.reject(req, res, next)
);

router.post('/:id/start', requireCreator, (req, res, next) =>
  dealsController.start(req, res, next)
);

router.post('/:id/submit', requireCreator, validateBody(submissionValidator), (req, res, next) =>
  dealsController.submit(req, res, next)
);

// Business actions
router.post('/:id/approve', requireBusiness, (req, res, next) =>
  dealsController.approve(req, res, next)
);

router.post('/:id/request-revision', requireBusiness, (req, res, next) =>
  dealsController.requestRevision(req, res, next)
);

router.post('/:id/complete', requireBusiness, (req, res, next) =>
  dealsController.complete(req, res, next)
);

// Submissions
router.get('/:id/submissions', (req, res, next) =>
  dealsController.getSubmissions(req, res, next)
);

export default router;
