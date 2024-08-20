import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../index";
import { BaseQueue } from "./_base";
import { ControlledInterval } from "@/utils/ControlledInterval";

export class InstanceScheduler extends BaseQueue implements Adapters.AdapaterInstanceScheduler {
	queue: BullMQ.Queue<Adapters.InstanceIdentifier, any, string>;
	constructor(redis: Redis) {
		super(redis);
		this.queue = this.createQueue("instances");
	}

	async schedule(data: Adapters.InstanceIdentifier) {
		// `bullmq` will discard job with same ids
		// We leverage this behaviour to ensure we don't schedule
		// actors instance if they  that are already in the pipeline
		const periodId = (Date.now() / 1000).toFixed(0);
		const job = {
			id: `${data.kind}:${data.id}:${periodId}`,
			data: {
				kind: data.kind,
				id: data.id,
			},
		};

		await this.queue.add("instance", job.data, {
			jobId: job.id,
		});

		return job.id;
	}

	subscribe(callback: (event: Adapters.InstanceIdentifier, context: {}) => any) {
		const worker = new BullMQ.Worker<Adapters.InstanceIdentifier>(
			this.queue.name,
			async (job) => {
				await callback(job.data, {});
			},
			{
				autorun: false,
				concurrency: 10 ** 9,
				connection: this.redis,
				prefix: this.queue.opts.prefix,
			},
		);

		worker.run();

		// PAUSE NEW JOB FROM BEEING PROCESSED IF CPU IS GROWING TOO FAST
		// const cpuCheckInterval = ControlledInterval.new({
		//   interval: 1000,
		//   execute: () => {
		//     const cpuUsage = process.cpuUsage();
		//     const isTooHigh = cpuUsage.user > 1000;
		//     if (isTooHigh) {
		//       if (worker.isRunning()) worker.pause();
		//     } else {
		//       if (worker.isPaused()) worker.resume();
		//     }
		//   },
		// });

		return {
			unsubscribe() {
				const DO_NOT_WAIT = true;
				worker.pause(DO_NOT_WAIT);
				// cpuCheckInterval.dispose();
				return worker.close();
			},
		};
	}
}
