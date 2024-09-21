import { Adapters } from "@/adapters";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { SpawnkitError } from '@/models/Error';

export const HEALTH_CHECK_INTERVAL = 5000;
export const HEALTH_CHECK_NOTIFY_PER_INTERVAL = 3;

type HealthCheckMessage = true;

export class InstanceStalledError extends SpawnkitError {
	name: string = 'InstanceStalledError';
}

export class HealthCheckEmitter {
	adapters: Adapters;
	instance: { kind: string; id: string };

	static getChannelForHealthSignal() {
		return `broadcast:__INTERNAL__:health` as const;
	}

	constructor(adapters: Adapters, instance: { kind: string; id: string }) {
		this.adapters = adapters;
		this.instance = instance;
	}

	emitter = null as ControlledInterval | null;
	start() {
		this.emitter = ControlledInterval.new({
			interval: HEALTH_CHECK_INTERVAL / HEALTH_CHECK_NOTIFY_PER_INTERVAL,
			execute: async (count) => {
				return await this.adapters.messages.publish<HealthCheckMessage>(
					this.instance,
					HealthCheckEmitter.getChannelForHealthSignal(),
					true,
				);
			},
		});
	}

	dispose() {
		if (this.emitter) {
			this.emitter.dispose();
			this.emitter = null;
		}
	}
}

export class HealthCheckListener {
	abortCtl = new AbortController();

	adapters: Adapters;
	instance: { kind: string; id: string };

	constructor(adapters: Adapters, instance: { kind: string; id: string }) {
		this.adapters = adapters;
		this.instance = instance;
	}

	currentTimeout = null as any;
	currentSubscription = null as any;
	start() {
		if (this.disposed) return;

		this.createAbortInterval();
		this.currentSubscription = this.adapters.messages.subscribe<HealthCheckMessage>(
			this.instance,
			HealthCheckEmitter.getChannelForHealthSignal(),
			(message) => this.reset(),
		);;

		this.abortCtl.signal.addEventListener("abort", () => {
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
			this.abortCtl.abort()
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
	}

	onAbortCallbacks: (() => void)[] = [];
	onHealthCheckFailed(callback: () => void) {
		this.onAbortCallbacks.push(callback);
	}
}
