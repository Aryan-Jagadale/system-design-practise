import { useSyncExternalStore } from "react";

import { chatDatabase } from "../base/basechat";

export function useDatabase() {
  return useSyncExternalStore(
    chatDatabase.subscribe.bind(chatDatabase),
    chatDatabase.getSnapshot.bind(chatDatabase),
  );
}
