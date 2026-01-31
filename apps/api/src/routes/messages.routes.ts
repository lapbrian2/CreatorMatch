import { Router } from 'express';
import { messagesController } from '../controllers/messages.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { messageSchema } from '@creatormatch/shared-utils';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

const createConversationValidator = z.object({
  participantId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
});

// List conversations
router.get('/', (req, res, next) => messagesController.getConversations(req, res, next));

// Create conversation
router.post('/', validateBody(createConversationValidator), (req, res, next) =>
  messagesController.createConversation(req, res, next)
);

// Get messages in conversation
router.get('/:id/messages', (req, res, next) => messagesController.getMessages(req, res, next));

// Send message
router.post('/:id/messages', validateBody(messageSchema), (req, res, next) =>
  messagesController.sendMessage(req, res, next)
);

// Mark conversation as read
router.patch('/:id/read', (req, res, next) => messagesController.markAsRead(req, res, next));

// Archive conversation
router.delete('/:id', (req, res, next) => messagesController.archiveConversation(req, res, next));

export default router;
