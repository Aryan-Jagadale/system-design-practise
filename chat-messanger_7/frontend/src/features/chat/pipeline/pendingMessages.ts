import { filter, map } from "rxjs/operators";

import { chatDatabase } from "../base/basechat";
import { messageAdded$ } from "../base/databaseEvents";

export const pendingMessages$ = messageAdded$.pipe(
  map((id) => chatDatabase.getMessage(id)),

  filter(
    (message): message is NonNullable<typeof message> =>
      message !== undefined
  ),

  filter((message) => message.status === "pending")
);