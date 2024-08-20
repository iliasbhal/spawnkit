import { wait } from "../utils/wait";
import { Adapters, InstanceId, InstanceKind } from "../adapters";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { Logger } from "./Logger";

export class LockError extends Error {}

export class AcquireLockError extends LockError {
	constructor(resource: string, ownerId: string) {
		super(`Couldn\'t acquire lock (resource:${resource} | owner:${ownerId})`);
	}
}

export class LockReleaseError extends LockError {
	constructor(resource: string, ownerId: string) {
		super(`Couldn\'t release lock (resource:${resource} | owner:${ownerId})`);
	}
}

export class LockExtendError extends LockError {
	constructor(resource: string, ownerId: string) {
		super(`Couldn\'t extend lock (resource:${resource} | owner:${ownerId})`);
	}
}

interface LockConfig {
	resource: string;
	duration: number;
	extendBeforeThreshold?: number;
	instance: {
		kind: InstanceKind;
		id: InstanceId;
	};
}

interface InstanceLockConfig {
	resource: string;
	duration: number;
	extendBeforeThreshold: number;
}

export class Lock {
	static AcquireLockError = AcquireLockError;
	static ExtendError = LockExtendError;
	static ReleaseError = LockReleaseError;

	config: InstanceLockConfig;
	adapters: Adapters;
	logger: Logger;
	ownerId: string;
	expireAt: number = 0;

	getConfig(input: LockConfig): InstanceLockConfig {
		const config = input;

		if (Math.floor(config.duration) !== config.duration) {
			throw new Error("Duration must be an integer value in milliseconds.");
		}

		const extendBeforeThreshold = config.extendBeforeThreshold || (config.duration * 2) / 3;
		const isValidExtension = extendBeforeThreshold > config.duration - 100;
		if (isValidExtension) {
			throw new Error(
				"A lock `duration` must be at least 100ms greater than the `extendBeforeThreshold` setting.",
			);
		}

		return Object.assign({}, config, {
			extendBeforeThreshold,
		});
	}

	constructor(
		config: LockConfig & {
			adapters: Adapters;
			ownerId: string;
			logger: Logger;
		},
	) {
		this.config = this.getConfig(config);
		this.ownerId = config.ownerId;
		this.adapters = config.adapters;
		this.logger = config.logger;
	}

	createLockTimelineLogger(
		type: "acquire" | "extend" | "release",
		resource: string,
		duration: number,
	) {
		const lockAttemptId = crypto.randomUUID();
		return {
			start: () => {
				this.logger.log({
					type: `lock:${type}:start`,
					attemptId: lockAttemptId,
					resourceId: resource,
					duration: duration,
				});
			},
			failed: () => {
				this.logger.log({
					type: `lock:${type}:failed`,
					attemptId: lockAttemptId,
					resourceId: resource,
					duration: duration,
				});
			},
			success: () => {
				this.logger.log({
					type: `lock:${type}:success`,
					attemptId: lockAttemptId,
					resourceId: resource,
					duration: duration,
				});
			},
		};
	}

	acquired = false;
	async acquire() {
		const { resource, duration } = this.config;
		const expireAt = Date.now() + duration;

		const logger = this.createLockTimelineLogger("acquire", resource, duration);
		logger.start();

		const acquired = await this.adapters.lock.acquire(resource, this.ownerId, duration);

		if (!acquired) {
			logger.failed();
			throw new AcquireLockError(resource, this.ownerId);
		}

		logger.success();
		this.expireAt = expireAt;
		this.acquired = true;
		return acquired;
	}

	async extend() {
		const { resource, duration } = this.config;
		const expireAt = Date.now() + duration;

		const logger = this.createLockTimelineLogger("extend", resource, duration);
		logger.start();

		const extended = await this.adapters.lock.extend(resource, this.ownerId, duration);
		if (!extended) {
			logger.failed();
			throw new LockExtendError(resource, this.ownerId);
		}

		logger.success();
		this.expireAt = expireAt;
	}

	async release() {
		const { resource } = this.config;

		const logger = this.createLockTimelineLogger("extend", resource, 0);
		logger.start();

		const released = await this.adapters.lock.release(resource, this.ownerId);
		if (!released) {
			logger.failed();
			throw new LockReleaseError(resource, this.ownerId);
		}

		logger.success();
		this.expireAt = 0;
	}

	autoExtendLockInBackground(routineAbortSignal: AbortSignal) {
		const extendAbortCtl = new AbortController();
		extendAbortCtl.signal.addEventListener("abort", () => {
			this.logger.log({
				type: "lock:abort",
			});
		});

		Promise.resolve()
			.then(async () => {
				const { extendBeforeThreshold } = this.config;

				loop: while (true) {
					const timeBeforeExpire = this.expireAt - Date.now();
					const timeBeforeExtend = timeBeforeExpire - extendBeforeThreshold;
					if (routineAbortSignal.aborted) break loop;
					await wait(timeBeforeExtend);

					if (routineAbortSignal.aborted) break loop;
					await this.extend();
				}
			})
			.catch((err) => {
				// If an error happens after the routine has completed,
				// we can safely ignore, otherwise, we throw the error;
				if (routineAbortSignal.aborted) return;
				extendAbortCtl.abort(err);
				throw err;
			});

		return extendAbortCtl.signal;
	}

	async using<T>(routine: (singal: AbortSignal) => Promise<T>) {
		await this.acquire();

		// If we are not able to acquire the lock in the first place
		// there is not point in going through all the code below.
		const routineAbortCtl = new AbortController();
		const abortExtSignal = this.autoExtendLockInBackground(routineAbortCtl.signal);

		try {
			const routinePromise = routine(abortExtSignal);
			const result = await Promise.race([
				ControlledPromise.wrapSignal(abortExtSignal), // <-- this never resolves, it only throws
				routinePromise,
			]);

			routineAbortCtl.abort();

			return result as Awaited<typeof routinePromise>;
		} finally {
			this.release().catch((err) => {
				const routineCompleted = routineAbortCtl.signal.aborted;
				if (!routineCompleted) {
					throw err;
				}
			});
		}
	}
}
