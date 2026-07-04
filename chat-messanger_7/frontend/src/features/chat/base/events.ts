export type DatabaseEvent =
  | {
      type: "MESSAGE_ADDED";
      messageId: string;
    }
  | {
      type: "MESSAGE_UPDATED";
      messageId: string;
    };
