import type { InstanceSignalEvent, InterfaceAPI } from "./InstanceProxy";

export class Instance<
  InstanceData extends Record<string, any> = Record<string, any>,
  InstanceChannels extends Record<string, any> = Record<string, any>,
> {
  __types = {} as {
    InstanceData: InstanceData;
    InstanceChannels: InstanceChannels;
  };

  on?(event: InstanceSignalEvent): any;

  id!: string;
  kind!: string;
  api!: InterfaceAPI<InstanceData, InstanceChannels>;

  get data() {
    return this.api.data;
  }

  /** this will send a message to all client subscribed to this instance specified channel */
  public async emit<Channel extends keyof InstanceChannels>(
    channel: Channel,
    data: InstanceChannels[Channel],
  ) {
    return await this.api.emit(channel, data);
  }

  public async waitFor(promise: Promise<any>) {
    return this.api.waitFor(promise);
  }
}
