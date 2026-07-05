import type { Message } from "../types/chat";
import { emitServerEvent } from "./serverEvents";

class FakeServer {
  async sendMessage(message: Message) {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    emitServerEvent({
      type: "MESSAGE_ACK",
      messageId: message.id,
    });

    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        conversationId: message.conversationId,
        senderId: "2",
        text: `Reply to: ${message.text}`,
        createdAt: new Date().toISOString(),
        status: "sent",
      };

      emitServerEvent({
        type: "MESSAGE_RECEIVED",
        message: reply,
      });
    }, 2000);
  }
}

export const fakeServer = new FakeServer();
