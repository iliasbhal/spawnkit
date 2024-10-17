import { Adapters } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { CacheMap } from "@/utils/CacheMap";
import { Logger } from "./Logger";
import { Client } from "./Client";
import { EventListener } from "@/utils/EventListenener";

export class Data<DataShape extends Record<string, any>> {
	changes = new EventListener<DataShape>();

	dispose() {
		this.changes.clear();
	}

	logger: Logger;
	adapters: Adapters;
	instance: {
		kind: string;
		id: string;
	};

	cache = new CacheMap();

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
			await this.adapters.data.set(this.instance.kind, this.instance.id, key.toString(), value);

			this.emitChange(key, value);

			// cleanup to ensure we don't end up with a big object
			// in the case where the instance is using a lot of keys
			this.debounceByKey.delete(key);
		});
	}

	async emitChange<K extends keyof DataShape>(key: K, value: DataShape[K]) {
		this.changes.notify(key, value);

		this.logger.log({
			type: "data:set",
			key: key.toString(),
			value: value,
		});

		const channel = Client.getChannelForEventBus("data", key.toString());
		await this.adapters.messages.publish(this.instance, channel, value);
	}
}
