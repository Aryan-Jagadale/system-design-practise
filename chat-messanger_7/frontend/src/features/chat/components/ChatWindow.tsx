import type { Conversation,Message } from "../types/chat";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  onSend: (text: string) => void;
}

export default function ChatWindow({
  conversation,
  messages,
  onSend
}: ChatWindowProps) {
  return (
    <div className="flex flex-1 flex-col">
      <ChatHeader conversation={conversation} />

      <MessageList messages={messages} />

      <MessageInput onSend={onSend} />
    </div>
  );
}