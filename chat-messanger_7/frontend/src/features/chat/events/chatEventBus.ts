import { Subject } from "rxjs";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import type { ChatEvent } from "./eventBus";
import type { Message } from "../types/chat";

class ChatEventBus {
  private subject = new Subject<ChatEvent>();

  emit(event: ChatEvent) {
    this.subject.next(event);
  }

  events(): Observable<ChatEvent> {
    return this.subject.asObservable();
  }

  messageCreated$(): Observable<Message> {
    return this.events().pipe(
      filter(
        (event): event is Extract<ChatEvent, { type: "MESSAGE_CREATED" }> =>
          event.type === "MESSAGE_CREATED",
      ),
      map((event) => event.message),
    );
  }

  messageAck$(): Observable<string> {
    return this.events().pipe(
      filter(
        (event): event is Extract<ChatEvent, { type: "MESSAGE_ACK" }> =>
          event.type === "MESSAGE_ACK",
      ),
      map((event) => event.messageId),
    );
  }

  messageReceived$(): Observable<Message> {
    return this.events().pipe(
      filter(
        (event): event is Extract<ChatEvent, { type: "MESSAGE_RECEIVED" }> =>
          event.type === "MESSAGE_RECEIVED",
      ),
      map((event) => event.message),
    );
  }
}

export const chatEventBus = new ChatEventBus();
