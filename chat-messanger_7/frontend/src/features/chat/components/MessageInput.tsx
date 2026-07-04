import { useState } from "react";

interface MessageInputProps {
  onSend: (text: string) => void;
}

export default function MessageInput({
  onSend,
}: MessageInputProps) {
  const [text, setText] = useState("");

  function handleSend() {
    if (!text.trim()) {
      return;
    }

    onSend(text);

    setText("");
  }

  return (
    <div className="border-t p-4 flex gap-2">
      <input
        className="flex-1 rounded border p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
        placeholder="Type a message..."
      />

      <button
        onClick={handleSend}
        className="rounded bg-blue-500 px-4 text-white"
      >
        Send
      </button>
    </div>
  );
}