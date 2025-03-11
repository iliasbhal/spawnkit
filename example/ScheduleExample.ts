import * as Spawnkit from "../src";
import { InstanceLog } from "../src/adapters";

interface LiveDocumentData {
	pages: string[];
}

interface DocumentChange {
	changes: object;
}

export class LiveDocument extends Spawnkit.Instance<LiveDocumentData> {
	on(channel, message) {

	}

	update(change: DocumentChange) { }
}
