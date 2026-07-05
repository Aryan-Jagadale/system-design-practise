// import { Subject } from "rxjs";
import type { Message } from "../types/chat";

export type ChatEvent =
  | {
      type: "MESSAGE_CREATED";
      message: Message;
    }
  | {
      type: "MESSAGE_ACK";
      messageId: string;
    }
  | {
      type: "MESSAGE_RECEIVED";
      message: Message;
    };

// export const chatEvents$ = new Subject<ChatEvent>();