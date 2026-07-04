import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { useChatController } from "./controller/chatController";
import { sendMessage } from "./actions/chatActions";

// import { chatDatabase } from "./base/basechat";

export default function ChatLayout() {
  const {
    conversations,
    selectedConversation,
    messages,
    selectedConversationId,
  } = useChatController();

  if (!selectedConversation) {
    return <div>No conversation selected</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
      />

      <ChatWindow
        conversation={selectedConversation}
        messages={messages}
        onSend={(text) => sendMessage(selectedConversation.id, text)}
      />
    </div>
  );
}
