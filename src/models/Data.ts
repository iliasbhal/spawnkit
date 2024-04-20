import { Adapters } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { Logger } from "./Logger";
import { Client } from "./Client";

export class Data<DataShape extends Record<string, any>> {
  logger: Logger;
  adapters: Adapters;
  instance: {
    kind: string;
    id: string;
  };

  cache = new Cache();

  constructor(config: {
    adapters: Adapters;
    logger: Logger;
    instance: {
      kind: string;
      id: string;
    };
  }) {
    this.logger = config.logger;
    this.adapters = config.adapters;
    this.instance = config.instance;
  }

  async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    this.logger.log({
      type: "data:get",
      key: key.toString(),
    });

    const data = await this.adapters.data.get<DataShape[K] | null>(
      this.instance.kind,
      this.instance.id,
      key.toString(),
    );

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
      await this.adapters.data.set(
        this.instance.kind,
        this.instance.id,
        key.toString(),
        value,
      );

      const channel = Client.getChannelForDataUpdate(
        this.instance.kind,
        this.instance.id,
        key.toString(),
      );

      this.logger.log({
        type: "data:set",
        key: key.toString(),
        value: value,
      });

      await this.adapters.messages.publish(channel, value, {
        mode: "pubsub",
      });
      // cleanup to ensure we don't end up with a big object
      // in the case where the instance is using a lot of keys
      this.debounceByKey.delete(key);
    });
  }
}

export class RemoteData<DataShape extends Record<string, any>> {
  adapters: Pick<Adapters, "data" | "messages">;
  instance: {
    kind: string;
    id: string;
  };

  constructor(config: {
    adapters: Pick<Adapters, "data" | "messages">;
    instance: {
      kind: string;
      id: string;
    };
  }) {
    this.adapters = config.adapters;
    this.instance = config.instance;
  }

  async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
    return await this.adapters.data.get(
      this.instance.kind,
      this.instance.id,
      key.toString(),
    );
  }

  on<K extends keyof DataShape>(key: K, callback: (next: DataShape[K]) => any) {
    const channel = Client.getChannelForDataUpdate(
      this.instance.kind,
      this.instance.id,
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
