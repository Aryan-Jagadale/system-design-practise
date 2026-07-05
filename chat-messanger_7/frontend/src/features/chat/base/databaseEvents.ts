import { Subject } from "rxjs";
import { filter, map } from "rxjs/operators";

export type DatabaseEvent =
  | {
      type: "MESSAGE_ADDED";
      messageId: string;
    }
  | {
      type: "MESSAGE_UPDATED";
      messageId: string;
    };

const subject = new Subject<DatabaseEvent>();

export const databaseEvents$ = subject.asObservable();

export function emitDatabaseEvent(event: DatabaseEvent) {
  console.log("emitDatabaseEvent", event);
  subject.next(event);
}

export const messageAdded$ = databaseEvents$.pipe(
  filter(
    (event): event is Extract<DatabaseEvent, { type: "MESSAGE_ADDED" }> =>
      event.type === "MESSAGE_ADDED",
  ),
  map((event) => event.messageId),
);

export const messageUpdated$ = databaseEvents$.pipe(
  filter(
    (event): event is Extract<DatabaseEvent, { type: "MESSAGE_UPDATED" }> =>
      event.type === "MESSAGE_UPDATED",
  ),
  map((event) => event.messageId),
);
