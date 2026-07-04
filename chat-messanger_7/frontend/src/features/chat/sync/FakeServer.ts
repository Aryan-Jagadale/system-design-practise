import type { Message } from "../types/chat";

export function sendMessageToServer(message: Message): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}
