import { conversations } from "../mock/conversations";
import { messages } from "../mock/messages";

import type { Conversation, Message } from "../types/chat";

import type { DatabaseEvent } from "./events";

type Listener = (event: DatabaseEvent) => void;

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

  private notify(event: DatabaseEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  getSnapshot = () => {
    return this.state;
  };

  getConversation(id: string) {
    return this.state.conversations.find((c) => c.id === id);
  }

  getMessages(conversationId: string) {
    return this.state.messages.filter(
      (message) => message.conversationId === conversationId,
    );
  }

  addMessage(message: Message) {
    this.state = {
      ...this.state,
      messages: [...this.state.messages, message],
    };

    this.notify({
      type: "MESSAGE_ADDED",
      messageId: message.id,
    });
  }

  updateMessage(id: string, updates: Partial<Message>) {
    this.state = {
      ...this.state,
      messages: this.state.messages.map((message) =>
        message.id === id ? { ...message, ...updates } : message,
      ),
    };

    this.notify({
      type: "MESSAGE_UPDATED",
      messageId: id,
    });
  }

  getPendingMessages() {
    return this.state.messages.filter(
      (message) => message.status === "pending",
    );
  }
}

export const chatDatabase = new ChatDatabase();
