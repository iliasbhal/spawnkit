import { Adapters, InstanceId } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";

export class Data<DataShape extends Record<string, any>> {
  adapters: Pick<Adapters, "data" | "messages">;
  instanceId: InstanceId;

  constructor(config: {
    adapters: Pick<Adapters, "data" | "messages">;
    instanceId: InstanceId;
  }) {
    this.adapters = config.adapters;
    this.instanceId = config.instanceId;
  }

  async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
    return await this.adapters.data.get(this.instanceId, key.toString());
  }

  debounceByKey = new Map<keyof DataShape, AsyncDebounceHandler>();
  async set<K extends keyof DataShape>(key: K, value: DataShape[K]) {
    if (!this.debounceByKey.has(key)) {
      this.debounceByKey.set(key, new AsyncDebounceHandler());
    }

    const debouncer = this.debounceByKey.get(key)!;

    await debouncer.onlyLastOnePerTick(async () => {
      await this.adapters.data.set(this.instanceId, key.toString(), value);

      const channel = this.getChannelForInstanceKeyUpdates(key.toString());
      await this.adapters.messages.publish(channel, value);
      // cleanup to ensure we don't end up with a big object
      // in the case where the instance is using a lot of keys
      this.debounceByKey.delete(key);
    });
  }

  getChannelForInstanceKeyUpdates(key: string) {
    return `${this.instanceId}:key:${key}:data-update`;
  }

  on<K extends keyof DataShape>(key: K, callback: (next: DataShape[K]) => any) {
    const channel = this.getChannelForInstanceKeyUpdates(key.toString());
    return this.adapters.messages.subscribe<DataShape[K]>(channel, (event) => {
      callback(event.data);
    });
  }
}
