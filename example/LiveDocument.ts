import * as Spawnkit from "@/.";

interface LiveDocumentData {
  pages: string[];
}

interface DocumentChange {
  changes: object;
}

export class LiveDocument extends Spawnkit.Instance<LiveDocumentData> {
  async start(): Promise<any> {}
  async stop(): Promise<any> {}

  update(change: DocumentChange) {}
}
