import * as Spawnkit from "@/.";

interface ChatRoomData {
  messages: string[];
}

export class ChatRoom extends Spawnkit.Instance<ChatRoomData> {
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  sendMessage(msg: string) {}
}
