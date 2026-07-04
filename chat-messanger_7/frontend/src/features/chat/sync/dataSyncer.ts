import { chatDatabase } from "../base/basechat";
import { sendMessageToServer } from "./FakeServer";
import type { Message } from "../types/chat";

class DataSyncer {
  async sendMessage(message: Message) {
    try {
      await sendMessageToServer(message);

      chatDatabase.updateMessage(message.id, {
        status: "sent",
      });
    } catch {
      chatDatabase.updateMessage(message.id, {
        status: "failed",
      });
    }
  }
}

export const dataSyncer = new DataSyncer();