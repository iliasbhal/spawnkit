import * as Adapters from "../../index";
import { Serde, RedisAdapter } from "./_base";

export class Data extends RedisAdapter implements Adapters.AdapaterData {
	async get<Data>(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
		key: string,
	): Promise<Data | null> {
		// console.log('GET DATA', kind, id, key);
		const data = await this.redis.get(`spawnkit:data:${kind}:${id}:${key}`);
		if (!data) return null;
		return Serde.deserialize(data);
	}

	async set<Data>(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
		key: string,
		value: Data,
	): Promise<true> {
		// console.log('SET DATA', kind, id, key, value);
		const serialized = Serde.serialize(value);
		await this.redis.set(`spawnkit:data:${kind}:${id}:${key}`, serialized);
		return true;
	}
}
