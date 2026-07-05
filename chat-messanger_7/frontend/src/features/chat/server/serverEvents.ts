import { Subject } from "rxjs";
import { filter, map } from "rxjs/operators";
import type { Message } from "../types/chat";

export type ServerEvent =
  | {
      type: "MESSAGE_ACK";
      messageId: string;
    }
  | {
      type: "MESSAGE_RECEIVED";
      message: Message;
    };

const subject = new Subject<ServerEvent>();

export const serverEvents$ = subject.asObservable();

export function emitServerEvent(event: ServerEvent) {
  subject.next(event);
}

export const messageAck$ = serverEvents$.pipe(
  filter(
    (
      event
    ): event is Extract<ServerEvent, { type: "MESSAGE_ACK" }> =>
      event.type === "MESSAGE_ACK"
  ),
  map((event) => event.messageId)
);

export const messageReceived$ = serverEvents$.pipe(
  filter(
    (
      event
    ): event is Extract<ServerEvent, { type: "MESSAGE_RECEIVED" }> =>
      event.type === "MESSAGE_RECEIVED"
  ),
  map((event) => event.message)
);