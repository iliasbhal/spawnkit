import { Adapters, InstanceId } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";

export class Data<DataShape extends Record<string, any>> {
  adapters: Pick<Adapters, "data">;
  instanceId: InstanceId;

  constructor(config: {
    adapters: Pick<Adapters, "data">;
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

      // cleanup to ensure we don't end up with a big object
      // in the case where the instance is using a lot of keys
      this.debounceByKey.delete(key);
    });
  }
}
