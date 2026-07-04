import type { Conversation } from "../types/chat";
import ConversationItem from "./ConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
}: ConversationListProps) {
  return (
    <div>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === selectedConversationId}
        />
      ))}
    </div>
  );
}