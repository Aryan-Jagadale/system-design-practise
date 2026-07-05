import { chatDatabase } from "../base/basechat";
// import { chatEventBus } from "../events/chatEventBus";
import { fakeServer } from "../server/FakeServer";
import type { Message } from "../types/chat";
import { messageAck$, messageReceived$ } from "../server/serverEvents";

class DataSyncer {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    messageAck$.subscribe((messageId) => {
      chatDatabase.updateMessage(messageId, {
        status: "sent",
      });
    });

    messageReceived$.subscribe((message) => {
      chatDatabase.addMessage(message);
    });
  }

  async sendMessage(message: Message) {
    await fakeServer.sendMessage(message);
  }
}

export const dataSyncer = new DataSyncer();