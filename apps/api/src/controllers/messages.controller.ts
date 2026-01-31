import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { sendSuccess } from '../utils/response';

export class MessagesController {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const conversations = await messageService.getConversations(userId);

      sendSuccess(res, conversations);
    } catch (error) {
      next(error);
    }
  }

  async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { participantId, dealId } = req.body;
      const conversation = await messageService.getOrCreateConversation(userId, participantId, dealId);

      sendSuccess(res, conversation, 201);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await messageService.getMessages(id, userId, page, limit);

      sendSuccess(res, messages);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const { content, attachmentUrl, attachmentType } = req.body;
      const message = await messageService.sendMessage(id, userId, content, attachmentUrl, attachmentType);

      sendSuccess(res, message, 201);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      await messageService.markAsRead(id, userId);

      sendSuccess(res, { message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async archiveConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      await messageService.archiveConversation(id, userId);

      sendSuccess(res, { message: 'Conversation archived' });
    } catch (error) {
      next(error);
    }
  }
}

export const messagesController = new MessagesController();
