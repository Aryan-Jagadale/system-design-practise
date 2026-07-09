import { chatDatabase } from "../base/basechat";
// import { chatEventBus } from "../events/chatEventBus";
import { fakeServer } from "../server/FakeServer";
import type { Message } from "../types/chat";
import { messageAck$, messageReceived$ } from "../server/serverEvents";
import { EMPTY, from, throwError, timer } from "rxjs";
import { catchError, retry, tap } from "rxjs/operators";

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
    chatDatabase.updateMessage(message.id, {
      status: "sending",
      retryCount: 0,
    });

    return from(fakeServer.sendMessage(message)).pipe(
      retry({
        count: 3,

        delay: (error, retryCount) => {
          const delay = Math.pow(2, retryCount) * 1000;
          const jitter = Math.random() * 500;

          chatDatabase.updateMessage(message.id, {
            status: "retrying",
            retryCount,
          });

          console.log(`Retry ${retryCount} after ${delay}ms`);

          return timer(delay + jitter);
        },
      }),
      tap(() => {
        console.log("Successfully sent");
      }),
      catchError((error) => {
        console.log("Message permanently failed");

        chatDatabase.updateMessage(message.id, {
          status: "failed",
        });

        return EMPTY;
      }),
    );
  }
}

export const dataSyncer = new DataSyncer();
