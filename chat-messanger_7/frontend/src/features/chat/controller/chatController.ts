import { useDatabase } from "../hooks/useDatabase";
import { useChatStore } from "../store/ChatStore";

export function useChatController() {
  const database = useDatabase();

  const selectedConversationId = useChatStore(
    (state) => state.selectedConversationId
  );

  const selectConversation = useChatStore(
    (state) => state.selectConversation
  );

  const conversations = database.conversations;

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id === selectedConversationId
    ) ?? null;

  const messages = database.messages.filter(
    (message) =>
      message.conversationId === selectedConversationId
  );

  console.log("conver",conversations)

  return {
    conversations,
    selectedConversation,
    messages,
    selectedConversationId,
    selectConversation,
  };
}