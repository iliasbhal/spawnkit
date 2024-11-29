import { Adapters } from "@/adapters";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { CacheMap } from "@/utils/CacheMap";
import { Logger } from "./Logger";
import { Client } from "./Client";
import { EventListener } from "@/utils/EventListenener";

export class Data<DataShape extends Record<string, any>> {
	changes = new EventListener<DataShape>();
	namespace?: string;

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
		namespace?: string;
		instance: {
			kind: string;
			id: string;
		};
	}) {
		this.logger = config.logger;
		this.adapters = config.adapters;
		this.instance = config.instance;
		this.namespace = config.namespace;
	}

	private getNamespacedKey(key: string) {
		return this.namespace ? `${this.namespace}:${key}` : key;
	}

	withNamespace<DataShape extends Record<string, any>>(namespace: string) {
		return new Data<DataShape>({
			adapters: this.adapters,
			logger: this.logger,
			namespace,
			instance: this.instance,
		});
	}

	async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
		const namescapedKey = this.getNamespacedKey(key.toString());

		if (this.cache.has(namescapedKey)) {
			return this.cache.get(namescapedKey);
		}

		this.logger.log({
			type: "data:get",
			key: namescapedKey,
		});

		const data = await this.adapters.data.get<DataShape[K] | null>(
			this.instance.kind,
			this.instance.id,
			namescapedKey,
		);

		this.cache.set(namescapedKey, data);
		return data;
	}

	debounceByKey = new Map<keyof DataShape, AsyncDebounceHandler>();
	async set<K extends keyof DataShape>(key: K, value: DataShape[K]) {
		const namescapedKey = this.getNamespacedKey(key.toString());

		this.cache.set(namescapedKey, value);

		if (!this.debounceByKey.has(namescapedKey)) {
			this.debounceByKey.set(namescapedKey, new AsyncDebounceHandler());
		}

		const debouncer = this.debounceByKey.get(namescapedKey)!;
		await debouncer.onlyLastOnePerTick(async () => {
			await this.adapters.data.set(this.instance.kind, this.instance.id, namescapedKey, value);

			this.emitChange(namescapedKey, value);

			// cleanup to ensure we don't end up with a big object
			// in the case where the instance is using a lot of keys
			this.debounceByKey.delete(namescapedKey);
		});
	}

	async emitChange(key: string, value: any) {
		this.changes.notify(key, value);

		this.logger.log({
			type: "data:set",
			key: key.toString(),
			value: value,
		});

		const channel = Client.getChannelForEventBus("data", key);
		await this.adapters.messages.publish(this.instance, channel, value);
	}
}

export class ClientData<DataShape extends Record<string, any>> {
	namespace?: string;
	adapters: Pick<Adapters, "data" | "messages">;
	instance: {
		kind: string;
		id: string;
	};

	constructor(config: {
		adapters: Pick<Adapters, "data" | "messages">;
		namespace?: string;
		instance: {
			kind: string;
			id: string;
		};
	}) {
		this.adapters = config.adapters;
		this.instance = config.instance;
		this.namespace = config.namespace;
	}

	private getNamespacedKey(key: string) {
		return this.namespace ? `${this.namespace}:${key}` : key;
	}

	withNamespace<DataShape extends Record<string, any>>(namespace: string) {
		return new ClientData<DataShape>({
			adapters: this.adapters,
			namespace,
			instance: this.instance,
		});
	}

	async get<K extends keyof DataShape>(key: K): Promise<DataShape[K] | null> {
		const namescapedKey = this.getNamespacedKey(key.toString());
		return await this.adapters.data.get(this.instance.kind, this.instance.id, namescapedKey);
	}

	on<K extends keyof DataShape>(key: K, callback: (next: DataShape[K]) => any) {
		const namescapedKey = this.getNamespacedKey(key.toString());
		const channel = Client.getChannelForEventBus("data", namescapedKey);

		return this.adapters.messages.subscribe<DataShape[K]>(this.instance, channel, (event) => {
			callback(event.data);
		});
	}
}
