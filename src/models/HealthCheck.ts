import { Adapters } from "@/adapters";
import { ControlledInterval } from "@/utils/ControlledInterval";

export const HEALTH_CHECK_INTERVAL = 5000;
export const HEALTH_CHECK_NOTIFY_PER_INTERVAL = 3;

type HealthCheckMessage = true;

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
		this.createAbortInterval();
		this.currentSubscription = this.adapters.messages.subscribe<HealthCheckMessage>(
			this.instance,
			HealthCheckEmitter.getChannelForHealthSignal(),
			(message) => this.reset(),
		);

		this.onHealthCheckFailed(() => {
			this.dispose();
		});
	}

	reset() {
		this.disposeInterval();
		this.createAbortInterval();
	}

	createAbortInterval() {
		this.currentTimeout = setTimeout(() => this.abortCtl.abort(), HEALTH_CHECK_INTERVAL);
	}

	disposeInterval() {
		if (this.currentTimeout) {
			clearTimeout(this.currentTimeout);
		}
	}

	dispose() {
		this.disposeInterval();
		this.currentSubscription?.unsubscribe();
		this.onAbortCallbacks.forEach((callback) => {
			this.abortCtl.signal.removeEventListener("abort", callback);
		});
	}

	onAbortCallbacks: (() => void)[] = [];
	onHealthCheckFailed(callback: () => void) {
		this.abortCtl.signal.addEventListener("abort", callback);
		this.onAbortCallbacks.push(callback);
	}
}
