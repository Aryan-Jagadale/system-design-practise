import { BehaviorSubject } from "rxjs";
import { queueManager } from "../queue/QueueManager";

class NetworkManager {
  private onlineSubject = new BehaviorSubject(true);

  online$ = this.onlineSubject.asObservable();

  setOnline(online: boolean) {
    this.onlineSubject.next(online);
    if(online){
        queueManager.wakeUp();
    }
  }

  isOnline() {
    return this.onlineSubject.value;
  }
}

export const networkManager = new NetworkManager();