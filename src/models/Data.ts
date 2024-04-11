import { Adapters, InstanceId } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";

export class Data<DataShape extends Record<string, any>> {
  adapters: Pick<Adapters, "data" | "messages">;
  instanceId: InstanceId;

  cache = new Cache();

  constructor(config: {
    adapters: Pick<Adapters, "data" | "messages">;
    instanceId: InstanceId;
  }) {
    this.adapters = config.adapters;
    this.instanceId = config.instanceId;
  }

  static getChannelForInstanceKeyUpdates(instanceId: string, key: string) {
    return `${instanceId}:key:${key}:data-update`;
  }

  async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const data = await this.adapters.data.get(this.instanceId, key.toString());
    this.cache.set(key, data);
    return data;
  }

  debounceByKey = new Map<keyof DataShape, AsyncDebounceHandler>();
  async set<K extends keyof DataShape>(key: K, value: DataShape[K]) {
    this.cache.set(key, value);

    if (!this.debounceByKey.has(key)) {
      this.debounceByKey.set(key, new AsyncDebounceHandler());
    }

    const debouncer = this.debounceByKey.get(key)!;
    await debouncer.onlyLastOnePerTick(async () => {
      await this.adapters.data.set(this.instanceId, key.toString(), value);

      const channel = Data.getChannelForInstanceKeyUpdates(
        this.instanceId,
        key.toString(),
      );
      await this.adapters.messages.publish(channel, value);
      // cleanup to ensure we don't end up with a big object
      // in the case where the instance is using a lot of keys
      this.debounceByKey.delete(key);
    });
  }
}

export class RemoteData<DataShape extends Record<string, any>> {
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

  on<K extends keyof DataShape>(key: K, callback: (next: DataShape[K]) => any) {
    const channel = Data.getChannelForInstanceKeyUpdates(
      this.instanceId,
      key.toString(),
    );
    return this.adapters.messages.subscribe<DataShape[K]>(channel, (event) => {
      callback(event.data);
    });
  }
}

class Cache extends Map {
  get(key: any) {
    this.scheduleCleanup(key);
    return super.get(key);
  }

  set(key: any, value: any) {
    super.set(key, value);
    this.scheduleCleanup(key);
    return this;
  }

  timeouts: Record<any, any> = {};
  private scheduleCleanup(key: any) {
    const timeoutId = setTimeout(() => {
      this.delete(key);
    }, 10_000);

    this.timeouts[key] = timeoutId;
  }
}
