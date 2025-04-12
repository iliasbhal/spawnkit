import { Adapters, InstanceMethodCall } from "@/adapters/_common";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { EventListener } from "@/utils/EventListenener";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { SpawnkitError } from './Error';

export const HEALTH_CHECK_INTERVAL = 5000;
export const HEALTH_CHECK_NOTIFY_PER_INTERVAL = 2;

type HealthCheckMessage = true;

export class InstanceStalledError extends SpawnkitError {
	name: string = 'InstanceStalledError';
}

export interface HealthCheckEmitterChannels {
	stalled: InstanceStalledError;
}

export class HealthCheckEmitter {
	eventListener = new EventListener<HealthCheckEmitterChannels>();

	adapter: Adapters;
	instance: { kind: string; id: string };

	static getChannelForHealthSignal() {
		return `broadcast:__INTERNAL__:health` as const;
	}

	constructor(adapter: Adapters, instance: { kind: string; id: string }) {
		this.adapter = adapter;
		this.instance = instance;
	}

	checkTimesPerInterval = HEALTH_CHECK_INTERVAL;
	assertNotStalled(event: InstanceMethodCall) {
		const now = Date.now();
		const timeSinceCallStarted = now - event.timestamp;
		const isStalledEvent = timeSinceCallStarted > HEALTH_CHECK_INTERVAL;
		if (isStalledEvent) {
			throw new InstanceStalledError();
		}
	}

	emitter = null as ControlledInterval | null;
	stalled = this.createStalledEmitter();
	start() {
		this.stalled.start(HEALTH_CHECK_INTERVAL);
		this.emitter = ControlledInterval.new({
			interval: HEALTH_CHECK_INTERVAL / HEALTH_CHECK_NOTIFY_PER_INTERVAL,
			execute: async (count) => {
				this.stalled.restart();

				await this.adapter.messages.publish<HealthCheckMessage>(
					this.instance,
					HealthCheckEmitter.getChannelForHealthSignal(),
					true,
				);
			},
		});
	}

	createStalledEmitter() {
		const timeout = new ControlledTimeout();
		timeout.await.then(() => {
			this.eventListener.notify("stalled", new InstanceStalledError());
		});

		return timeout;
	}

	dispose() {
		this.emitter?.dispose();
		this.emitter = null;
		this.stalled.stop();
	}
}

interface HealthCheckListenerChannels {
	abort: any
}

export class HealthCheckListener {
	eventListener = new EventListener<HealthCheckListenerChannels>();

	adapter: Adapters;
	instance: { kind: string; id: string };

	constructor(adapter: Adapters, instance: { kind: string; id: string }) {
		this.adapter = adapter;
		this.instance = instance;
	}

	currentTimeout = null as any;
	currentSubscription = null as any;
	start() {
		if (this.disposed) return;

		this.createAbortInterval();
		this.currentSubscription = this.adapter.messages.subscribe<HealthCheckMessage>(
			this.instance,
			HealthCheckEmitter.getChannelForHealthSignal(),
			(message) => this.reset(),
		);;

		this.eventListener.on("abort", () => {
			this.onAbortCallbacks.forEach((callback) => callback());
			this.dispose();
		});
	}

	reset() {
		this.disposeInterval();
		this.createAbortInterval();
	}

	createAbortInterval() {
		this.currentTimeout = setTimeout(() => {
			this.eventListener.notify("abort", {});
		}, HEALTH_CHECK_INTERVAL);
	}

	disposeInterval() {
		if (this.currentTimeout) {
			clearTimeout(this.currentTimeout);
		}
	}

	disposed = false;
	dispose() {
		this.disposed = true;
		this.disposeInterval();
		this.currentSubscription?.unsubscribe();
		this.eventListener.clear();
	}

	onAbortCallbacks: (() => void)[] = [];
	onHealthCheckFailed(callback: () => void) {
		this.onAbortCallbacks.push(callback);
	}
}
