import { InstanceSignal } from "@/adapters";
import type { InterfaceAPI } from "./InstanceProxy";

type AnyRecord = { [key: string]: any };

export class Instance<
  InstanceData extends AnyRecord = AnyRecord,
  InstanceChannels extends AnyRecord = AnyRecord,
> {
  __types = {} as {
    InstanceData: InstanceData;
    InstanceChannels: InstanceChannels;
  };

  signal(signal: InstanceSignal) {}

  // TODO: FIX TYPING HERE
  // For some reason, adding types here break the client types.
  on(
    channel: keyof InstanceChannels,
    message: InstanceChannels[keyof InstanceChannels],
  ) {}

  get id() {
    return this.api.id;
  }
  get kind() {
    return this.api.kind;
  }

  api!: InterfaceAPI<InstanceData, InstanceChannels>;

  get logger() {
    return this.api.logger;
  }

  get data() {
    return this.api.data;
  }

  /** this will send a message to all client subscribed to this instance specified channel */
  public async emit<Channel extends Extract<keyof InstanceChannels, string>>(
    channel: Channel,
    message: InstanceChannels[Channel],
  ) {
    await this.api.emit(channel, message);

    try {
      this.on?.(channel, message);
    } catch (err) {
      // SILENCE ANY ERROR HAPPENING DURING THE EVENT HANDLER
      console.log(err);
    }

    return;
  }

  public async waitFor(promise: Promise<any>) {
    return this.api.waitFor(promise);
  }
}
