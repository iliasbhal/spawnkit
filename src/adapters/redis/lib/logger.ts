import * as Adapters from "../../index";
import { Serde, RedisAdapter } from "./_base";

/**
 * This class is used for internaltools
 * Using the data in stored with it, we'll be able to build tools
 * to debug and trace back what happens
 * TODO: also output files ( easier to debug with );
 */
export class Logger extends RedisAdapter implements Adapters.AdapterLogger {
	async log(instance: Adapters.InstanceIdentifier, ownerId: string, signal: Adapters.InstanceLog) {
		return;

		const now = Date.now();
		const serialized = await Serde.serialize({
			...signal,
			timestamp: now,
		});

		await Promise.all([
			this.redis.zadd(`spawnkit:logs:${instance.kind}:${instance.id}:index`, now, ownerId),
			this.redis.lpush(`spawnkit:logs:${instance.kind}:${instance.id}:logs:${ownerId}`, serialized),
		]);
	}

	/** list log groups for this instance */
	async list(
		instance: Adapters.InstanceIdentifier,
		range: { from: number; to: number } = {
			from: 0,
			to: -1 /* -1 = until the last element */,
		},
	): Promise<string[]> {
		return await this.redis.zrange(
			`spawnkit:logs:${instance.kind}:${instance.id}:index`,
			range.from,
			range.to,
			"REV",
		);
	}

	/* retieve all the logs from a log group */
	async get(
		instance: Adapters.InstanceIdentifier,
		ownerId: string,
	): Promise<Adapters.InstanceLog[]> {
		const rawLogs = await this.redis.lrange(
			`spawnkit:logs:${instance.kind}:${instance.id}:logs:${ownerId}`,
			0,
			-1,
		);

		return await Promise.all(
			rawLogs.map((raw) => Serde.deserialize<Adapters.InstanceLog>(raw))
		);
	}

	async delete(
		instance: Adapters.InstanceIdentifier,
		range: { from: number; to: number },
	): Promise<any> {
		// TODO: add ability to delete logs
	}
}
