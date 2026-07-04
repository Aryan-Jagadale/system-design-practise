import type { Conversation } from "../types/chat";

export const conversations: Conversation[] = [
  {
    id: "1",
    participant: {
      id: "2",
      name: "John Doe",
      avatar: "",
    },
    lastMessage: "See you tomorrow!",
    lastMessageTime: "10:30 AM",
  },
  {
    id: "2",
    participant: {
      id: "3",
      name: "Jane Smith",
      avatar: "",
    },
    lastMessage: "Thanks!",
    lastMessageTime: "Yesterday",
  },
  {
    id: "3",
    participant: {
      id: "4",
      name: "Alex Johnson",
      avatar: "",
    },
    lastMessage: "Let's catch up.",
    lastMessageTime: "Monday",
  },
];