import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { loginValidator, registerValidator } from '../validators/auth.validator';

const router = Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

// Public routes
router.post('/register', validateBody(registerValidator), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', validateBody(loginValidator), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// Protected routes
router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

router.get('/me', authenticate, (req, res, next) =>
  authController.me(req, res, next)
);

export default router;
