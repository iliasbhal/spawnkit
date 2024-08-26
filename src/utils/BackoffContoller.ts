import { wait } from "./wait";

type BackoffConfig = {
	strategy: BACKOFF_STRATEGIES;
	minWaitTime?: number;
	maxWaitTime?: number;
	stepCount?: number;
};

enum BACKOFF_STRATEGIES {
	LERP = "lerp",
}

export class BackoffController {
	failAttemptCount = 0;
	config: Required<BackoffConfig>;

	static LERP = BACKOFF_STRATEGIES.LERP;

	static new(config?: BackoffConfig) {
		const backoff = new BackoffController(config);
		return backoff;
	}

	constructor(config?: BackoffConfig) {
		this.config = Object.assign(
			{},
			{
				strategy: config?.strategy || BACKOFF_STRATEGIES.LERP,
				minWaitTime: config?.minWaitTime || 0,
				maxWaitTime: config?.maxWaitTime || 700,
				stepCount: config?.stepCount || 20,
			},
		);
	}

	reset() {
		this.failAttemptCount = 0;
	}

	async waitUsingLerp() {
		const { minWaitTime, maxWaitTime, stepCount } = this.config;
		const emptyRunCountClamped = Math.min(stepCount, this.failAttemptCount);
		const ratio = emptyRunCountClamped / maxWaitTime;
		const waitTimeMs = lerp(minWaitTime, maxWaitTime, ratio);
		this.failAttemptCount++;
		await wait(waitTimeMs);
	}

	async waitUntilNextAttempt() {
		if (this.config.strategy === BACKOFF_STRATEGIES.LERP) {
			return this.waitUsingLerp();
		}

		throw new Error(`Unknown backoff strategy: ${this.config.strategy}`);
	}
}

export const lerp = (min: number, max: number, ratio: number) => {
	return min + ratio * (max - min);
};
