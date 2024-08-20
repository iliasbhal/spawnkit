import { Redis } from "ioredis";
import Redlock, { Lock as RedlockLock } from "redlock";
import * as Adapters from "../../index";
import { RedisAdapter } from "./_base";

export class Lock extends RedisAdapter implements Adapters.AdapterLock {
	redlock: Redlock;
	constructor(client: Redis) {
		super(client);
		this.redlock = new Redlock([client], {
			retryCount: 0,
			driftFactor: 0.05,
		});
	}

	lockByOwnerKey = new Map<string, RedlockLock>();

	private createOwnerKey(lockId: string, ownerId: string) {
		return `lockId:${lockId}:ownerId:${ownerId}`;
	}

	withPrefix(resource: string) {
		return `spawnkit:locks:${resource}`;
	}

	async acquire(resource: string, ownerId: string, duration: number): Promise<boolean> {
		try {
			const key = this.withPrefix(resource);
			const ownerKey = this.createOwnerKey(resource, ownerId);
			const lock = await this.redlock.acquire([key], duration);
			this.lockByOwnerKey.set(ownerKey, lock);
			return true;
		} catch (err) {
			if (err instanceof Error) {
				if (err.message.includes("unable to achieve a quorum ")) {
					return false;
				}
			}

			throw err;
		}
	}

	async extend(resource: string, ownerId: string, duration: number): Promise<boolean> {
		const ownerKey = this.createOwnerKey(resource, ownerId);
		const lock = this.lockByOwnerKey.get(ownerKey);
		if (!lock) return false;

		try {
			const newLock = await lock.extend(duration);
			this.lockByOwnerKey.set(ownerKey, newLock);
			return true;
		} catch (err) {
			this.lockByOwnerKey.delete(ownerKey);
			return false;
		}
	}

	async release(resource: string, ownerId: string): Promise<boolean> {
		const ownerKey = this.createOwnerKey(resource, ownerId);
		const lock = this.lockByOwnerKey.get(ownerKey);
		if (!lock) return false;

		try {
			await lock.release();
			return true;
		} catch (err) {
			return false;
		} finally {
			this.lockByOwnerKey.delete(ownerKey);
		}
	}
}
