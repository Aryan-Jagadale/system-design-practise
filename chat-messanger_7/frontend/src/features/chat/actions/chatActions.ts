import { chatDatabase } from "../base/basechat";
import { messageScheduler } from "../scheduler/MessageScheduler";
// import { dataSyncer } from "../sync/dataSyncer";
import type { Message } from "../types/chat";


export function sendMessage(conversationId: string, text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    senderId: "1",
    text: trimmed,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  chatDatabase.addMessage(message);

//   messageScheduler.processQueue();
}
