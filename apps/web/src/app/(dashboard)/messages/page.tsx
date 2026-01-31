'use client';

import { useState } from 'react';
import { Card, Avatar, Input, Button } from '@/components/ui';
import { formatRelativeTime } from '@creatormatch/shared-utils';
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Sample conversations - in real app, fetch from API
  const conversations = [
    {
      id: '1',
      otherParticipant: { name: 'Sarah Johnson', avatarUrl: null },
      lastMessagePreview: 'Thanks for reaching out! I would love to...',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      unreadCount: 2,
    },
    {
      id: '2',
      otherParticipant: { name: 'Mike Chen', avatarUrl: null },
      lastMessagePreview: "That sounds great! Let's discuss the details.",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
      unreadCount: 0,
    },
    {
      id: '3',
      otherParticipant: { name: 'Emma Davis', avatarUrl: null },
      lastMessagePreview: 'I have submitted the content for review.',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      unreadCount: 0,
    },
  ];

  // Sample messages - in real app, fetch from API
  const messages = [
    {
      id: '1',
      senderId: 'other',
      content: "Hi! I saw your campaign and I think I would be a great fit. I've worked with several local restaurants before.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: '2',
      senderId: 'me',
      content: "Thanks for reaching out, Sarah! I checked out your profile and love your content style. Would you be interested in doing 2 posts and 3 stories for our summer campaign?",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: '3',
      senderId: 'other',
      content: 'Thanks for reaching out! I would love to collaborate on this. What are the specific deliverables you have in mind?',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // In real app, call API to send message
    console.log('Sending:', newMessage);
    setNewMessage('');
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Chat with creators and businesses</p>
      </div>

      <Card className="h-[calc(100%-5rem)] flex">
        {/* Conversation List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Input placeholder="Search conversations..." />
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedConversation === conv.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={conv.otherParticipant.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conv.otherParticipant.name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.lastMessagePreview}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <Avatar
                  name={conversations.find((c) => c.id === selectedConversation)?.otherParticipant.name || ''}
                  size="sm"
                />
                <h3 className="font-medium text-gray-900">
                  {conversations.find((c) => c.id === selectedConversation)?.otherParticipant.name}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderId === 'me'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === 'me' ? 'text-primary-200' : 'text-gray-500'
                        }`}
                      >
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
