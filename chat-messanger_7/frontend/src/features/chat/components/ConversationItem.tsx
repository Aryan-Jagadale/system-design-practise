import { useChatStore } from "../store/ChatStore";
import type { Conversation } from "../types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
}

export default function ConversationItem({
  conversation,
  isSelected,
}: ConversationItemProps) {
  const selectConversation = useChatStore(
    (state) => state.selectConversation
  );

  return (
    <div
      onClick={() => selectConversation(conversation.id)}
      className={`cursor-pointer border-b p-4 ${
        isSelected ? "bg-muted" : "hover:bg-muted"
      }`}
    >
      <h3 className="font-semibold">
        {conversation.participant.name}
      </h3>

      <p className="text-sm text-muted-foreground">
        {conversation.lastMessage}
      </p>
    </div>
  );
}