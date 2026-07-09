export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: string;
}

export interface Message {
  id: string;
  senderId: string;
  conversationId: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  retryCount?: number;
}

export type MessageStatus =
    | "pending"
    | "sending"
    | "retrying"
    | "sent"
    | "failed";