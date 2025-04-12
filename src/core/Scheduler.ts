import { nanoid } from "nanoid";
import { wait } from "../utils/wait";
import { Lock } from "./Lock";
import { InstanceId, InstanceIdentifier, InstanceKind, ScheduleByType, ScheduleContext } from "../adapters/_common";
import type { Client, SpawnkitConfig } from "./Client";
import { InstanceProxy } from "./InstanceProxy";
import { EventBus } from "../utils/EventBus";

interface SchedulerEvents {
	'instance-error': Error;
}


export class Scheduler<O extends SpawnkitConfig> {
	instances: O["instances"];
	adapter: O["adapter"];
	client: Client<O>;

	eventBus = new EventBus<SchedulerEvents>();

	constructor(config: O, client: Client<any>) {
		this.instances = config.instances;
		this.adapter = config.adapter;
		this.client = client;
	}

	subscriptions = new Set<{ unsubscribe: Function }>()
	start() {
		this.startEventScheduler();
		this.startInstanceScheduler();
	}

	get on() {
		return this.eventBus.on;
	}

	startEventScheduler() {
		this.subscriptions.add(
			this.adapter.events.subscribe(async (data, context) => {
				await this.handleScheduledInstanceMethodCall(data, context);
			})
		);
	}

	startInstanceScheduler() {

		Object.keys(this.instances).forEach((kind) => {
			this.subscriptions.add(
				this.adapter.instances.subscribe(kind, async (data, context) => {

					// console.log('data', data);
					// console.log('SUBSCRIBED TO INSTANCE SCHEDULER', data, Object.keys(this.instances));
					await this.runOnlyOneOfInstance(data.kind, data.id, async () => {
						const exeuctionId = nanoid();
						await this.tryInstantiateInstance(exeuctionId, data);
					});
				})
			);
		});
	}

	async tryWakeInstanceUp(kind: InstanceKind, id: InstanceId) {
		// In the case that we are sending a lot of events
		// We don't have to try to schedule an instance together with every event we send.
		// Once an instance terminate, it will try again 3 times to check if there are pending events process.
		// We can rely on this fact to only schedule an instance if it has been a long time since last event push.
		// This is mainly to avoid adding unnessessary pressure the backend.
		const canScheduleInstance = this.shouldScheduleInstance(id);
		if (!canScheduleInstance) {
			return;
		}

		const instanceAlreadyRunningOnThisWorker = this.isInstanceRunning(
			kind.toString(),
			id,
		);
		if (instanceAlreadyRunningOnThisWorker) {
			return;
		}

		this.adapter.instances.schedule({ kind, id });
	}

	/**
	 * 
	 * create a proxy that should only be used internally
	 * do not start accepting from it!
	 */
	createInternalProxy(kind: InstanceKind, id: InstanceId) {
		return new InstanceProxy({
			ownerId: '__internal__',
			indenfier: { kind, id },
			adapter: this.adapter,
			client: this.client,
		});
	}

	timestampByInstance = new Map<InstanceId, number>();
	private shouldScheduleInstance(instanceId: InstanceId) {
		const now = Date.now();
		const lastSentEventTimesamp = this.timestampByInstance.get(instanceId);
		this.timestampByInstance.set(instanceId, now);

		if (!lastSentEventTimesamp) {
			return true;
		}

		const timeSinceLastEventSent = now - lastSentEventTimesamp;
		const shouldScheduleInstance = timeSinceLastEventSent > 1000;
		return shouldScheduleInstance;
	}


	liveInstances = new Map<string, Set<string>>();
	async runOnlyOneOfInstance<Callback extends () => Promise<void>>(
		kind: string,
		id: string,
		callback: Callback,
	) {
		if (!this.liveInstances.get(kind)) {
			this.liveInstances.set(kind, new Set<string>());
		}

		const liveInstances = this.liveInstances.get(kind)!;
		if (liveInstances.has(id)) return false;

		try {
			liveInstances.add(id);
			return await callback();
		} finally {
			liveInstances.delete(id);
		}
	}

	isInstanceRunning(kind: string, id: string) {
		return this.liveInstances.get(kind)?.has(id) || false;
	}

	evictInstance = async (identifier: InstanceIdentifier) => {
		const ressourceID = this.getInstanceRessourceId(identifier);
		const proxy = this.runningInstancesByRessourceId.get(ressourceID);
		if (!proxy) return;

		await proxy.stop();
		await this.tryWakeInstanceUp(identifier.kind, identifier.id);
	}

	stop() {
		this.subscriptions.forEach((sub) => sub.unsubscribe());
		this.runningInstancesByOwnerId.forEach((proxy) => {
			this.evictInstance(proxy.indenfier);
		})
	}

	private async handleScheduledInstanceMethodCall(
		scheduleEvent: ScheduleByType["event"],
		context: ScheduleContext,
	) {
		const { kind, id } = scheduleEvent.instance;
		const { action, args } = scheduleEvent.event;

		const remoteInstance = this.client.spawn<any, any>(kind, id, {});
		try {
			await remoteInstance.utils.sendRPC({
				timestamp: Date.now(),
				args,
				action,
				mode: "skip",
				context: {
					...context,
					context: scheduleEvent.event.context,
				},
			});

		} finally {
			// Ensure we dispose of the instance
			// To avoid any memory leaks
			remoteInstance.dispose();
		}

	}

	runningInstancesByOwnerId: Map<string, InstanceProxy<any>> = new Map();
	runningInstancesByRessourceId: Map<string, InstanceProxy<any>> = new Map();
	getInstanceRessourceId(instance: InstanceIdentifier) {
		return `${instance.kind}:${instance.id}`;
	}
	registerInstance(ownerId: string, instance: InstanceProxy<any>) {
		this.runningInstancesByOwnerId.set(ownerId, instance);

		const ressourceID = this.getInstanceRessourceId(instance.indenfier);
		this.runningInstancesByRessourceId.set(ressourceID, instance);
	}

	unregisterInstanceByOwnerId(ownerId: string) {
		const instance = this.runningInstancesByOwnerId.get(ownerId)
		this.runningInstancesByOwnerId.delete(ownerId);

		const ressourceID = this.getInstanceRessourceId(instance.indenfier);
		this.runningInstancesByRessourceId.delete(ressourceID);
	}

	private async tryInstantiateInstance(exeuctionId: string, instanceConfig: ScheduleByType["instance"]) {
		// When instantiating a new instance, we should acquire a lock
		// So that only one worker in the cloud is instantiating the instance
		// This is to prevent from executing side effects twice and race conditions.
		const MIN_LOCK_DURATION = 5_000;
		const lock = new Lock({
			adapter: this.adapter,
			ownerId: exeuctionId,
			instance: instanceConfig,
			duration: MIN_LOCK_DURATION,
			extendBeforeThreshold: MIN_LOCK_DURATION / 2,
		});

		const proxy = new InstanceProxy({
			ownerId: exeuctionId,
			indenfier: instanceConfig,
			adapter: this.adapter,
			client: this.client,
		});

		try {
			await lock.using(async (abortSignal) => {
				// console.log('LOCK ACQUIRED');
				this.registerInstance(exeuctionId, proxy);
				proxy.syncWithAbortSignal(abortSignal);
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
				this.eventBus.emit('instance-error', err);
				throw err;
			}

		} finally {
			this.unregisterInstanceByOwnerId(exeuctionId);
		}

		// console.log('UNLOCKED');

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

					const hasUnprocessedEvents = await this.adapter.messages.has(
						instanceConfig,
						instanceConfig.id,
					);

					if (hasUnprocessedEvents) {
						this.tryWakeInstanceUp(instanceConfig.kind, instanceConfig.id);
					}
				}
			});
		}
	}

	static from<O extends SpawnkitConfig>(opts: O, client: Client<any>) {
		Scheduler.verify(opts.instances);

		if (process.env.NODE_ENV !== "test") {
			Object.keys(opts.instances).forEach((kind) => {
				console.log(`SpawnKit: ready to handle "${kind}" instances`);
			});
		}

		return new Scheduler<O>(opts, client);
	}

	static verify(instances: SpawnkitConfig["instances"]) {
		if (Object.keys(instances).length === 0) {
			throw new Error(`Validation Error: worker configured with 0 instances`);
		}
	}
}
