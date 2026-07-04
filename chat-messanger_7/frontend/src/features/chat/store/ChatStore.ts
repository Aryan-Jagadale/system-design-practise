import { create } from "zustand";

import { chatDatabase } from "../base/basechat";

interface ChatStore {
  selectedConversationId: string;

  selectConversation: (id: string) => void;
}

const conversations = chatDatabase.getConversations();

export const useChatStore = create<ChatStore>((set) => ({
  selectedConversationId: conversations[0]?.id ?? "",

  selectConversation: (id) =>
    set({
      selectedConversationId: id,
    }),
}));