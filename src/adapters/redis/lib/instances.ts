import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../index";
import { BaseQueue } from "./_base";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { Affinity, Toleration, Trait } from "@/models/Toleration";
import { Client } from "@/models/Client";
import { nanoid } from "nanoid";

interface JobData {
	kind: string;
	id: string;
	config: {
		affinities: Affinity[];
		retryCount?: number;
	};
}

interface WorkerRegistration {
	timestamp: number;
	name: string;
	config: { traits: Trait[] };
}

export class InstanceScheduler extends BaseQueue implements Adapters.AdapaterInstanceScheduler {
	instanceQueue: BullMQ.Queue<JobData, any, string>;
	constructor(redis: Redis) {
		super(redis);
		this.instanceQueue = this.createQueue("instances");
	}

	async schedule(config: { affinities: Affinity[]; retryCount?: number }, schedule: Adapters.InstanceIdentifier) {
		// The schedule job is added to the global 'schedule" queue 
		// To be then routed to the a compatible worker queue.

		const job = this.getScheduleInstanceJobId(schedule, config);
		await this.instanceQueue.add("schedule", job.data, {
			jobId: job.id,
		});

		return job.id;
	}

	startScheduleRouter() {
		return new BullMQ.Worker<JobData & { __retryCount?: number }>(
			this.instanceQueue.name,
			async (job) => {

				console.log('SCHEDULE JOB', job.data)

				const workersQueues = await this.findCompatibleWorkerQueues(job.data.config)

				console.log('------ WORKERS QUEUES ----', workersQueues.length)
				if (workersQueues.length > 0) {
					return await Promise.all([
						workersQueues.map((queue) => {
							queue.add(job.name, job.data, {
								jobId: job.id,
							});
						})
					]);
				}


				// If no workers are compatible, we can move the job to delayed and try again
				const retryCount = job.data.config.retryCount || 0;
				console.log('retryCount', retryCount)
				if (retryCount === 3) {
					throw new Error("couldn't find compatibe workers");
				}

				const now = Date.now();
				const IN_3_SECONDS = now + 1 * retryCount * 1000;

				console.log('RESCEDULE', job.id);

				setTimeout(async () => {
					const nextJobId = await this.schedule({ ...job.data.config, retryCount: retryCount + 1 }, job.data);
					console.log('RESCEDULED!!!!!!!', nextJobId);

				}, 1000)

			},
			{
				autorun: true,
				concurrency: 10 ** 9,
				connection: this.redis,
				prefix: this.instanceQueue.opts.prefix,
			},
		);
	}

	subscribe(config: { traits: Trait[]; }, callback: (data: Adapters.InstanceIdentifier, context: Adapters.ScheduleContext) => any) {
		console.log('SUBSCRIBE', config.traits)

		const schedulerWorker = this.startScheduleRouter();

		const workerQueue = this.getWorkerQueue();
		let workerRegistration = this.registerWorkerQueue(workerQueue, config);

		const worker = new BullMQ.Worker<JobData>(
			workerQueue.name,
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
			onConfigChanged(config: { traits: Trait[] }) {
				workerRegistration.unregister();
				workerRegistration = this.registerWorkerQueue(workerQueue, config);
			},

			async unsubscribe() {
				// cpuCheckInterval.dispose();

				workerRegistration.unregister();

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

	private REGISTER_INTERVAL = 2000;
	private async findCompatibleWorkerQueues(config: { affinities: Affinity[] }): Promise<BullMQ.Queue[]> {
		const registrationsRaw = await this.redis.hvals('worker-queue');
		const registrations = registrationsRaw.map((raw) => JSON.parse(raw) as WorkerRegistration);

		// console.log('REGISTRATIONS', registrations)

		const now = Date.now();
		const queues = registrations
			.filter((registration) => {
				const stallThreshold = registration.timestamp + (2 * this.REGISTER_INTERVAL);
				const isStalledRegistration = now > stallThreshold;
				return !isStalledRegistration;
			})
			.flatMap((registration) => {
				const score = Toleration.getCompatibilityScore(registration.config.traits, config.affinities);
				console.log('SCORE', score, registration.config.traits, config.affinities)
				if (score === 0) return [];
				return [{ registration, score }];
			})
			.sort((a, b) => b.score - a.score)
			.map(({ registration, score }) => {
				console.log('------- MAP')
				const workerQueue = this.createQueue(registration.name);
				return workerQueue;
			});


		console.log('DONE FINDING WORKERS', queues.length)
		return queues;
	}

	private registerWorkerQueue(workerQueue: BullMQ.Queue, config: { traits: Trait[] }) {
		const interval = ControlledInterval.new({
			interval: this.REGISTER_INTERVAL,
			execute: async () => {
				const registration: WorkerRegistration = {
					name: workerQueue.name,
					config,
					timestamp: Date.now()
				}

				this.redis.hset(`worker-queue`, workerQueue.name, JSON.stringify(registration));

				const stored = this.getStoredTraits(config.traits);
				this.redis.hset(workerQueue.keys[''] + 'traits', stored);
			}
		})

		return {
			unregister() {
				interval.dispose();
			}
		}
	}

	private getStoredTraits(traits: Trait[]) {
		return traits.reduce((acc, trait, i, arr) => {


			if (!acc[trait.key]) {
				acc[trait.key] = [];
			}

			acc[trait.key].push({ [trait.value]: trait.type });

			const isLast = i === arr.length - 1;
			if (isLast) {
				Object.keys(acc).forEach((key) => {
					acc[key] = acc[key].sort((a, b) => a.type === 'required' ? -1 : 1);
					acc[key] = JSON.stringify(acc[key]);
				})
			}


			return acc;
		}, {});
	}

	private getWorkerQueue(): BullMQ.Queue {
		const workerId = nanoid()
		const workerQueue = this.createQueue(`workers:${workerId}`);
		return workerQueue;
	}

	private getScheduleInstanceJobId(schedule: Adapters.InstanceIdentifier, config: { affinities: Affinity[]; retryCount?: number }): { id: string, data: JobData } {
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
