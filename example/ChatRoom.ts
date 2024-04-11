import * as Spawnkit from "@/.";
import { SignalEvent } from "@/models/InstanceProxy";

interface ChatRoomData {
  messages: string[];
}

export class ChatRoom extends Spawnkit.Instance<ChatRoomData> {
  on(event: SignalEvent) {
    if (event == "start") {
      console.log("Chat ROOM WAKEN UP");
    }

    if (event == "dispose") {
      console.log("Chat ROOM WAKEN CHUTDOWN");
    }
  }

  sendMessage(msg: string) {}
}
