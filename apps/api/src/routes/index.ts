import { Router } from 'express';
import authRoutes from './auth.routes';
import creatorRoutes from './creators.routes';
import businessRoutes from './businesses.routes';
import campaignRoutes from './campaigns.routes';
import matchRoutes from './matches.routes';
import dealRoutes from './deals.routes';
import messageRoutes from './messages.routes';
import paymentRoutes from './payments.routes';

// Webhook routes are mounted directly in app.ts BEFORE the JSON body parser so
// the raw body is preserved for Stripe HMAC signature verification.

const router = Router();

router.use('/auth', authRoutes);
router.use('/creators', creatorRoutes);
router.use('/businesses', businessRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/matches', matchRoutes);
router.use('/deals', dealRoutes);
router.use('/conversations', messageRoutes);
router.use('/payments', paymentRoutes);

export default router;
