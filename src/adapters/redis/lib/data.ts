import SuperJSON from "superjson";
import * as Adapters from "../../index";
import { RedisAdapter } from "./_base";

export class Data extends RedisAdapter implements Adapters.AdapaterData {
	async get<Data>(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
		key: string,
	): Promise<Data | null> {
		// console.log('GET DATA', kind, id, key);
		const data = await this.redis.get(`spawnkit:data:${kind}:${id}:${key}`);
		if (!data) return null;
		return SuperJSON.parse(data);
	}

	async set<Data>(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
		key: string,
		value: Data,
	): Promise<true> {
		// console.log('SET DATA', kind, id, key, value);
		const serialized = SuperJSON.stringify(value);
		await this.redis.set(`spawnkit:data:${kind}:${id}:${key}`, serialized);
		return true;
	}
}
