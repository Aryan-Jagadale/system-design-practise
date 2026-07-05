import { chatDatabase } from "../base/basechat";
// import { chatEventBus } from "../events/chatEventBus";

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

  console.log("1. sendMessage called");

  chatDatabase.addMessage(message);

  // chatEventBus.emit({
  //   type: "MESSAGE_CREATED",
  //   message,
  // });
}
