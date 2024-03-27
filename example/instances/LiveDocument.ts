import * as Spawnkit from "@/.";

interface LiveDocumentData {
  pages: string[];
}

interface LiveDocumentEvent {
  changes: object;
}

export class LiveDocument extends Spawnkit.Instance<
  LiveDocumentData,
  LiveDocumentEvent
> {
  async stop(): Promise<any> {}

  async start(): Promise<any> {}

  async onEvent(event: LiveDocumentEvent): Promise<any> {}
}
