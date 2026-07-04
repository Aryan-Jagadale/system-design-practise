import type { Conversation } from "../types/chat";
import ConversationList from "./ConversationList";

interface SidebarProps {
  conversations: Conversation[];
  selectedConversationId: string;
}

export default function Sidebar({
  conversations,
  selectedConversationId,
}: SidebarProps) {
  return (
    <div className="w-80 border-r">
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
      />
    </div>
  );
}