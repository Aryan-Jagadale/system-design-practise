import { filter, take } from "rxjs/operators";

import { networkManager } from "../network/NetworkManager";

export function waitUntilOnline() {
  return networkManager.online$.pipe(
    filter(Boolean),

    take(1)
  );
}