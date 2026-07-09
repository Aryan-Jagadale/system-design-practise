import { concatMap } from "rxjs/operators";

import { pendingMessages$ } from "./pendingMessages";
import { waitUntilOnline } from "./onlineMessages";

import { dataSyncer } from "../sync/dataSyncer";

export const sendPipeline$ = pendingMessages$.pipe(
  concatMap((message) =>
    waitUntilOnline().pipe(
      concatMap(() => dataSyncer.sendMessage(message))
    )
  )
);