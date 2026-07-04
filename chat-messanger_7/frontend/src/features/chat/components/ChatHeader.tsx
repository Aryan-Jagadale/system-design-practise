import type { Conversation } from "../types/chat";

interface ChatHeaderProps {
  conversation: Conversation;
}

export default function ChatHeader({
  conversation,
}: ChatHeaderProps) {
  return (
    <div className="border-b p-4">
      <h2 className="text-lg font-semibold">
        {conversation.participant.name}
      </h2>

      <p className="text-sm text-muted-foreground">
        Online
      </p>
    </div>
  );
}