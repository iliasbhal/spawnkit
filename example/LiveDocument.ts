import * as Spawnkit from "../src";

interface LiveDocumentData {
  pages: string[];
}

interface DocumentChange {
  changes: object;
}

export class LiveDocument extends Spawnkit.Instance<LiveDocumentData> {
  update(change: DocumentChange) { }
}
