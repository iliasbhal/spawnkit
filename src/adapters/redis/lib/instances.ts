import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../index";
import { BaseQueue } from "./_base";

interface JobData {
	kind: string;
	id: string;
	config: any;
}
export class InstanceScheduler extends BaseQueue implements Adapters.AdapaterInstanceScheduler {
	instanceQueue: BullMQ.Queue<JobData, any, string>;
	constructor(redis: Redis) {
		super(redis);
		this.instanceQueue = this.createQueue("instances");
	}

	async schedule(schedule: Adapters.InstanceIdentifier) {
		const job = this.getScheduleInstanceJobId(schedule, {});
		await this.instanceQueue.add("schedule", job.data, {
			jobId: job.id,
		});

		return job.id;
	}

	subscribe(callback: (data: Adapters.InstanceIdentifier, context: Adapters.ScheduleContext) => any) {
		const worker = new BullMQ.Worker<JobData>(
			this.instanceQueue.name,
			async (job) => {
				await callback(job.data, {});
			},
			{
				autorun: true,
				concurrency: 10 ** 9,
				connection: this.redis,
				prefix: this.instanceQueue.opts.prefix,
			},
		);

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
			async unsubscribe() {
				console.log('UNSUBSCRIBE <<<<<<<<<')
				// cpuCheckInterval.dispose();
				const DO_NOT_WAIT = true;
				await Promise.all([
					worker.pause(DO_NOT_WAIT),
					// schedulerWorker.pause(DO_NOT_WAIT),
				]);

				await Promise.all([
					// schedulerWorker.close(),
					worker.close(),
				]);
				return
			},
		};
	}

	private getScheduleInstanceJobId(schedule: Adapters.InstanceIdentifier, config: any): { id: string, data: JobData } {
		// `bullmq` will discard job with same ids
		// We leverage this behaviour to ensure we don't schedule
		// actors instance if they  that are already in the pipeline
		const periodId = (Date.now() / 1000).toFixed(0);
		return {
			id: `${schedule.kind}:${schedule.id}:${periodId}:${config.retryCount}`,
			data: {
				kind: schedule.kind,
				id: schedule.id,
				config,
			},
		};
	}
}
