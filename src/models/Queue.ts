import { wait } from "../utils/wait";
import { Lock } from "./Lock";
import { ScheduleByType, ScheduleContext } from "../adapters";
import type { Client, SpawnkitConfig } from "./Client";
import { InstanceProxy } from "./InstanceProxy";
import { Logger } from "./Logger";
import { nanoid } from "nanoid";

export class Queue<O extends SpawnkitConfig> {
	instances: O["instances"];
	adapters: O["adapters"];
	client: Client<O>;

	constructor(config: O, client: Client<any>) {
		this.instances = config.instances;
		this.adapters = config.adapters;
		this.client = client;
	}

	start() {
		const eventSub = this.adapters.events.subscribe(async (data, context) => {
			return await this.callScheduledInstanceMethod(data, context);
		});

		const instancesSub = this.adapters.instances.subscribe(async (data, context) => {
			await this.client.runOnlyOneOfInstance(data.kind, data.id, async () => {
				await this.tryInstantiateInstance(data);
			});
		});

		this.stopCallback = () => {
			eventSub.unsubscribe();
			instancesSub.unsubscribe();
		};
	}

	private stopCallback?: Function;
	stop() {
		this.stopCallback?.();
	}

	private async callScheduledInstanceMethod(
		scheduleEvent: ScheduleByType["event"],
		context: ScheduleContext,
	) {
		const { kind, id } = scheduleEvent.instance;
		const { action, args } = scheduleEvent.event;

		console.log(
			`Scheduled Event: kind:${kind} id:${id} action:${action} config:${JSON.stringify(scheduleEvent.schedule)}`,
		);

		console.log("SENT CONTEXT", context);
		const remoteInstance = this.client.spawn<any>(kind, id);
		await remoteInstance.__INTERNAL__.sendEventToInstance({
			timestamp: Date.now(),
			args,
			action,
			mode: "skip",
			context,
		});
	}

	private async tryInstantiateInstance(instanceConfig: ScheduleByType["instance"]) {
		const Instance = this.instances[instanceConfig.kind];
		if (!Instance) {
			throw new Error(`Instance Kind Not Implemented (received: ${instanceConfig.kind})`);
		}

		// When instantiating a new instance, we should acquire a lock
		// So that only one worker in the cloud is instantiating the instance
		// This is to prevent from executing side effects twice and race conditions.
		const ownerId = nanoid();
		const logger = new Logger({
			adapters: this.adapters,
			ownerId: ownerId,
			instance: instanceConfig,
		});

		const MIN_LOCK_DURATION = 5_000;
		const RESOURCE_ID = `${instanceConfig.kind}:${instanceConfig.id}`;
		const lock = new Lock({
			adapters: this.adapters,
			ownerId: ownerId,
			resource: RESOURCE_ID,
			instance: instanceConfig,
			duration: MIN_LOCK_DURATION,
			extendBeforeThreshold: MIN_LOCK_DURATION / 2,
			logger,
		});

		try {
			await lock.using(async (abortSignal) => {
				const instance = new Instance();
				const proxy = new InstanceProxy({
					adapters: this.adapters,
					indenfier: instanceConfig,
					instance,
					abortSignal,
					logger,
					client: this.client,
				});

				await proxy.start();
			});
		} catch (err) {
			const shouldSilenceError =
				err instanceof Lock.AcquireLockError ||
				err instanceof Lock.ReleaseError;
			// we don't want to silence extend error because it's a critical error
			// that should be handled by the client.
			// err instanceof Lock.ExtendError || 
			if (!shouldSilenceError) {
				throw err;
			}
		}

		// // In order to make sure that we didn't miss any event and to avoid any race conditions
		// // we'll check if there any event left to process. But we do it outside of the lock.
		// // This will ensure that if there is another process trying to pick up those event
		// // this process doesn't acquire the lock.
		const wasJustLive = !!lock.acquired;
		if (wasJustLive) {
			Promise.resolve().then(async () => {
				const waitTimeBeforeAttemp = [200, 400, 800];

				for (const waitTime of waitTimeBeforeAttemp) {
					await wait(waitTime);

					const hasUnprocessedEvents = await this.adapters.messages.has(
						instanceConfig,
						instanceConfig.id,
					);

					if (hasUnprocessedEvents) {
						this.adapters.instances.schedule(instanceConfig);
					}
				}
			});
		}
	}

	static from<O extends SpawnkitConfig>(opts: O, client: Client<any>) {
		Queue.verify(opts.instances);

		if (process.env.NODE_ENV !== "test") {
			Object.keys(opts.instances).forEach((kind) => {
				console.log(`SpawnKit: ready to handle "${kind}" instances`);
			});
		}

		return new Queue<O>(opts, client);
	}

	static verify(instances: SpawnkitConfig["instances"]) {
		if (Object.keys(instances).length === 0) {
			throw new Error(`Validation Error: worker configured with 0 instances`);
		}
	}
}
