import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

// import { chatDatabase } from "./base/basechat";
import { useChatStore } from "./store/ChatStore";
  import { useDatabase } from "./hooks/useDatabase";


export default function ChatLayout() {
  const db = useDatabase();

  const selectedConversationId = useChatStore(
    (state) => state.selectedConversationId
  );

  const conversations = db.conversations;

  const selectedConversation =
    conversations.find(
        c => c.id === selectedConversationId
    )!;

  const messages = db.messages.filter(
    message =>
        message.conversationId === selectedConversationId
);

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
      />


      <ChatWindow
        conversation={selectedConversation}
        messages={messages}
      />
    </div>
  );
}