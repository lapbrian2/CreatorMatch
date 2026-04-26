import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/response';
import { Conversation, ConversationWithParticipant, Message } from '@creatormatch/shared-types';

export class MessageService {
  async getConversations(userId: string): Promise<ConversationWithParticipant[]> {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
        isArchived: false,
      },
      include: {
        participant1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            creatorProfile: { select: { displayName: true } },
            businessProfile: { select: { businessName: true } },
          },
        },
        participant2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            creatorProfile: { select: { displayName: true } },
            businessProfile: { select: { businessName: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((c) => this.formatConversationWithParticipant(c, userId));
  }

  async getOrCreateConversation(userId: string, otherUserId: string, dealId?: string): Promise<Conversation> {
    // Check if conversation exists
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: otherUserId },
          { participant1Id: otherUserId, participant2Id: userId },
        ],
        ...(dealId && { dealId }),
      },
    });

    if (existing) {
      return this.formatConversation(existing);
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participant1Id: userId,
        participant2Id: otherUserId,
        dealId,
      },
    });

    return this.formatConversation(conversation);
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50): Promise<Message[]> {
    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Mark as read
    const unreadField =
      conversation.participant1Id === userId ? 'participant1Unread' : 'participant2Unread';

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { [unreadField]: 0 },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return messages.reverse().map((m) => this.formatMessage(m));
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<Message> {
    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        attachmentUrl,
        attachmentType,
      },
    });

    // Update conversation
    const unreadField =
      conversation.participant1Id === userId ? 'participant2Unread' : 'participant1Unread';

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 255),
        [unreadField]: { increment: 1 },
      },
    });

    return this.formatMessage(message);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    const unreadField =
      conversation.participant1Id === userId ? 'participant1Unread' : 'participant2Unread';

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { [unreadField]: 0 },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true },
    });
  }

  private formatConversation(conversation: any): Conversation {
    return {
      id: conversation.id,
      dealId: conversation.dealId || undefined,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      lastMessagePreview: conversation.lastMessagePreview || undefined,
      participant1Unread: conversation.participant1Unread,
      participant2Unread: conversation.participant2Unread,
      isArchived: conversation.isArchived,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private formatConversationWithParticipant(
    conversation: any,
    currentUserId: string
  ): ConversationWithParticipant {
    const isParticipant1 = conversation.participant1Id === currentUserId;
    const otherParticipant = isParticipant1 ? conversation.participant2 : conversation.participant1;

    const getName = (user: any): string => {
      if (user.role === 'creator' && user.creatorProfile) {
        return user.creatorProfile.displayName;
      }
      if (user.role === 'business' && user.businessProfile) {
        return user.businessProfile.businessName;
      }
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
    };

    return {
      ...this.formatConversation(conversation),
      otherParticipant: {
        id: otherParticipant.id,
        name: getName(otherParticipant),
        avatarUrl: otherParticipant.avatarUrl || undefined,
        role: otherParticipant.role,
      },
    };
  }

  private formatMessage(message: any): Message {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      attachmentUrl: message.attachmentUrl || undefined,
      attachmentType: message.attachmentType || undefined,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString(),
      isSystemMessage: message.isSystemMessage,
      systemMessageType: message.systemMessageType || undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

export const messageService = new MessageService();
