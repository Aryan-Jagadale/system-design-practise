import type { Message } from "../types/chat";

export const messages: Message[] = [
  {
    id: "1",
    conversationId: "1",
    senderId: "2",
    text: "Hi Aryan!",
    createdAt: "10:00 AM",
  },
  {
    id: "2",
    conversationId: "1",
    senderId: "1",
    text: "Hey John 👋",
    createdAt: "10:01 AM",
  },
  {
    id: "3",
    conversationId: "1",
    senderId: "2",
    text: "How's everything going?",
    createdAt: "10:02 AM",
  },
  {
    id: "4",
    conversationId: "1",
    senderId: "1",
    text: "Pretty good! Working on a chat application.",
    createdAt: "10:03 AM",
  },
  {
    id: "5",
    conversationId: "2",
    senderId: "3",
    text: "Can you review my PR?",
    createdAt: "Yesterday",
  },
  {
    id: "6",
    conversationId: "2",
    senderId: "1",
    text: "Sure, I'll check it today.",
    createdAt: "Yesterday",
  },
  {
    id: "7",
    conversationId: "3",
    senderId: "4",
    text: "Weekend trip?",
    createdAt: "Monday",
  },
];