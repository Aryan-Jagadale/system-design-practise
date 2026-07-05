import { conversations } from "../mock/conversations";
import { messages } from "../mock/messages";

import type { Conversation, Message } from "../types/chat";

import { emitDatabaseEvent, databaseEvents$ } from "./databaseEvents";

import type { Subscription } from "rxjs";

export interface ChatState {
  conversations: Conversation[];
  messages: Message[];
}

class ChatDatabase {
  private state: ChatState = {
    conversations,
    messages,
  };

  getSnapshot = () => {
    return this.state;
  };

  getConversation(id: string) {
    return this.state.conversations.find((c) => c.id === id);
  }

  getMessages(conversationId: string) {
    return this.state.messages.filter(
      (m) => m.conversationId === conversationId,
    );
  }

  getMessage(id: string) {
    return this.state.messages.find((m) => m.id === id);
  }

  subscribe = (listener: () => void) => {
    console.log("React subscribed");
    const subscription: Subscription = databaseEvents$.subscribe(() => {
      console.log("Database event received");
      listener();
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  addMessage(message: Message) {
    console.log("2. addMessage");
    this.state = {
      ...this.state,
      messages: [...this.state.messages, message],
    };

    emitDatabaseEvent({
      type: "MESSAGE_ADDED",
      messageId: message.id,
    });
  }

  updateMessage(id: string, updates: Partial<Message>) {
    this.state = {
      ...this.state,
      messages: this.state.messages.map((message) =>
        message.id === id
          ? {
              ...message,
              ...updates,
            }
          : message,
      ),
    };

    emitDatabaseEvent({
      type: "MESSAGE_UPDATED",
      messageId: id,
    });
  }
}

export const chatDatabase = new ChatDatabase();
