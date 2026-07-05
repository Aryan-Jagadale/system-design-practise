import { chatDatabase } from "../base/basechat";
import { messageAdded$ } from "../base/databaseEvents";
import { dataSyncer } from "../sync/dataSyncer";

// class MessageScheduler {
//   private processing = false;

//   constructor() {
//     // chatEventBus.events().subscribe((event) => {
//     //   if (event.type === "MESSAGE_CREATED") {
//     //     this.processQueue();
//     //   }
//     // });

//     // chatEventBus
//     //   .events()
//     //   .pipe(filter((event) => event.type === "MESSAGE_CREATED"))
//     //   .subscribe(() => {
//     //     this.processQueue();
//     //   });

//     // chatEventBus.messageCreated$().subscribe(() => {
//     //   // process(message);
//     //   this.processQueue();
//     // });
//     this.registerListeners();
//   }

//   private registerListeners() {
//     chatEventBus.messageCreated$().subscribe((message) => {
//       this.processMessage(message);
//     });
//   }

//   private async processMessage(message:any) {
//     if (this.processing) return;

//     this.processing = true;

//     try {
//       await dataSyncer.sendMessage(message);
//     } finally {
//       this.processing = false;
//     }
//   }

//   // async processQueue() {
//   //   if (this.processing) return;

//   //   this.processing = true;

//   //   try {
//   //     while (true) {
//   //       const pending = chatDatabase.getPendingMessages();

//   //       if (pending.length === 0) {
//   //         break;
//   //       }

//   //       const message = pending[0];

//   //       chatDatabase.updateMessage(message.id, {
//   //         status: "sending",
//   //       });

//   //       await dataSyncer.sendMessage(message);
//   //     }
//   //   } finally {
//   //     this.processing = false;
//   //   }
//   // }
// }


class MessageScheduler {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    messageAdded$.subscribe(async (messageId) => {
      const message = chatDatabase.getMessage(messageId);

      if (!message) return;

      if (message.status !== "pending") return;

      chatDatabase.updateMessage(message.id, {
        status: "sending",
      });

      await dataSyncer.sendMessage(message);
    });
  }
}

export const messageScheduler = new MessageScheduler();
