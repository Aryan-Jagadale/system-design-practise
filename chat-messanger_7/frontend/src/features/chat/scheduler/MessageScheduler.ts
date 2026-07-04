import { chatDatabase } from "../base/basechat";
import { dataSyncer } from "../sync/dataSyncer";

class MessageScheduler {
  private processing = false;

  constructor() {
    chatDatabase.subscribe((event) => {
      if (event.type === "MESSAGE_ADDED") {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.processing) return;

    this.processing = true;

    try {
      while (true) {
        const pending = chatDatabase.getPendingMessages();

        if (pending.length === 0) {
          break;
        }

        const message = pending[0];

        chatDatabase.updateMessage(message.id, {
          status: "sending",
        });

        await dataSyncer.sendMessage(message);
      }
    } finally {
      this.processing = false;
    }
  }
}

export const messageScheduler = new MessageScheduler();
