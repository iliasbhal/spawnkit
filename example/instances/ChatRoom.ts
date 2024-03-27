import * as Spawnkit from "@/.";

interface ChatRoomData {
  messages: string[];
}

interface ChatRoomEvent {
  message: string;
}

export class ChatRoom extends Spawnkit.Instance<ChatRoomData, ChatRoomEvent> {
  async start(): Promise<any> {}

  async stop(): Promise<any> {}

  async onEvent(event: ChatRoomEvent): Promise<any> {
    console.log(event);
  }
}
