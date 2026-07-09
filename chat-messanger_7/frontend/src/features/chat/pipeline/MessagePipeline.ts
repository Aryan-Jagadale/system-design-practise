import { sendPipeline$ } from "./sendPipeline";

class MessagePipeline {
  constructor() {
    this.start();
  }

  private start() {
    sendPipeline$.subscribe({
      error(error) {
        console.error(error);
      },
    });
  }
}

export const messagePipeline = new MessagePipeline();