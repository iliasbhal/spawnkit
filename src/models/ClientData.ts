import { Adapters } from "@/adapters";
import { Client } from "./Client";

export class ClientData<DataShape extends Record<string, any>> {
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
		return await this.adapters.data.get(this.instance.kind, this.instance.id, key.toString());
	}

	on<K extends keyof DataShape>(key: K, callback: (next: DataShape[K]) => any) {
		const channel = Client.getChannelForEventBus("data", key.toString());

		return this.adapters.messages.subscribe<DataShape[K]>(this.instance, channel, (event) => {
			callback(event.data);
		});
	}
}
