import * as Spawnkit from "../src";

interface ChatRoomData {
	messages: string[];
}

export class ChatRoom extends Spawnkit.Instance<ChatRoomData> {
	on(channel: any, message: any): void {
		console.log("ON", channel, message);
	}

	sendMessage(msg: string) {

	}
}
