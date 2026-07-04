import { conversations } from "../mock/conversations";
import { messages } from "../mock/messages";

import type {
  Conversation,
  Message,
} from "../types/chat";

type Listener = () => void;

export interface ChatState {
  conversations: Conversation[];
  messages: Message[];
}

class ChatDatabase {
  private listeners = new Set<Listener>();

  private state: ChatState = {
    conversations,
    messages,
  };


  subscribe = (listener: Listener) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }


  getSnapshot = () => {
    return this.state;
  };


  getConversation(id: string) {
    return this.state.conversations.find(
      (c) => c.id === id
    );
  }

  getMessages(conversationId: string) {
    return this.state.messages.filter(
      (message) =>
        message.conversationId === conversationId
    );
  }



  addMessage(message: Message) {
    this.state = {
      ...this.state,
      messages: [...this.state.messages, message],
    };

    this.notify();
  }
}

export const chatDatabase = new ChatDatabase();