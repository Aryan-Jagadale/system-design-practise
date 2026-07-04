import type { Conversation,Message } from "../types/chat";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";



interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
}

export default function ChatWindow({
  conversation,
  messages,
}: ChatWindowProps) {
  return (
    <div className="flex flex-1 flex-col">
      <ChatHeader conversation={conversation} />

      <MessageList messages={messages} />

      <MessageInput />
    </div>
  );
}