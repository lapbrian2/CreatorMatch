export interface Conversation {
  id: string;
  dealId?: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participant1Unread: number;
  participant2Unread: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  readAt?: string;
  isSystemMessage: boolean;
  systemMessageType?: string;
  createdAt: string;
}

export interface ConversationWithParticipant extends Conversation {
  otherParticipant: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: 'creator' | 'business';
  };
  messages?: Message[];
}

export interface SendMessageRequest {
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}
