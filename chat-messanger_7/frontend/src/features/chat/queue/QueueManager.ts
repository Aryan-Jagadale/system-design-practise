import { Subject } from "rxjs";

class QueueManager {
  private processSubject = new Subject<void>();

  process$ = this.processSubject.asObservable();

  wakeUp() {
    console.log("QueueManager -> Wake Up");
    this.processSubject.next();
  }
}

export const queueManager = new QueueManager();