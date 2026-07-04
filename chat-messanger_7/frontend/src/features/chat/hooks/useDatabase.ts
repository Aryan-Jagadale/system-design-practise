import { useSyncExternalStore } from "react";

import { chatDatabase } from "../base/basechat";

export function useDatabase() {
  return useSyncExternalStore(
   chatDatabase.subscribe,
    chatDatabase.getSnapshot
  );
}
