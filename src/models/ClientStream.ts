import { Stream } from "./Stream";
import type { InstanceEventStreamMessage } from "./InstanceProxy";
import { RemoteError } from "./RemoteError";

export class ClientStream extends Stream<any> {
	constructor() {
		super(() => {});
	}

	lastIndex = -1;
	receivedMessageBuffer: InstanceEventStreamMessage[] = [];
	async forward(message: InstanceEventStreamMessage) {
		// await this.ensureStarted();
		this.receivedMessageBuffer.push(message);
		this.receivedMessageBuffer.sort((left, right) => left.index - right.index);
		// console.log("this.receivedMessageBuffer", this.receivedMessageBuffer);

		while (this.receivedMessageBuffer[0]) {
			const bufferedMsg = this.receivedMessageBuffer.shift()!;
			const isMessageInOrder = bufferedMsg.index == this.lastIndex + 1;
			if (!isMessageInOrder) {
				this.receivedMessageBuffer.unshift(bufferedMsg);
				break;
			}

			this.lastIndex = bufferedMsg.index;
			this.injest(bufferedMsg);
		}
	}

	injest(message: InstanceEventStreamMessage) {
		// console.log("INJEST", message);
		if ("start" in message) this.store("start");
		if ("data" in message) this.store("data", message.data);

		if ("error" in message) {
			const error = RemoteError.deserialize(message.error);
			this.error(error);
		}

		if ("end" in message) this.store("end");
	}
}
