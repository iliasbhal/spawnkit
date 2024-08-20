import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../index";
import { BaseQueue } from "./_base";
import { nanoid } from "nanoid";
import SuperJSON from "superjson";

export class EventScheduler extends BaseQueue implements Adapters.AdapterEventScheduler {
	queue: BullMQ.Queue<Adapters.ScheduleEventConfig, any, string>;
	constructor(redis: Redis) {
		super(redis);
		this.queue = this.createQueue("events");
	}

	getScheduleID(job: BullMQ.Job) {
		const scheduleId = job.repeatJobKey || job.id;
		return scheduleId!;
	}

	subscribe(
		callback: (event: Adapters.ScheduleEventConfig, context: { scheduleId: string }) => any,
	) {
		const worker = new BullMQ.Worker<Adapters.ScheduleEventConfig>(
			this.queue.name,
			async (job) => {
				const canProcess = this.ensureExactlyOnceExcution(job);
				if (!canProcess) return;

				const context = {
					scheduleId: this.getScheduleID(job),
				};

				await callback(job.data, context);
			},
			{
				autorun: false,
				// concurrency: this.config.concurrency,
				connection: this.redis,
				prefix: this.queue.opts.prefix,
			},
		);

		worker.run();
		return {
			unsubscribe() {
				return worker.close();
			},
		};
	}

	// BullMQ almost guarantee "exactly once" job execution
	// but it can happen to go execute "at least once"
	// This is why we need to make sure the event is not processed twice
	// As for instance, we don't care if they are instantiate twice'
	async ensureExactlyOnceExcution(job: BullMQ.Job<Adapters.ScheduleEventConfig>) {
		const jobData = job.data as Adapters.ScheduleByType["event"];
		const kind = jobData.instance.kind;
		const instanceId = jobData.instance.id;
		const jobKey = `spawnkit:locks:${kind}:${instanceId}:jobs:${job.id}`;
		const executCount = await this.redis.incr(jobKey);
		const hasAlreadyBeenExecuted = executCount > 1;
		if (hasAlreadyBeenExecuted) {
			return false;
		}

		return true;
	}

	async schedule(config: Adapters.ScheduleEventConfig) {
		const bullJobConfig =
			"delay" in config.schedule
				? {
						delay: config.schedule.delay,
					}
				: "cron" in config.schedule
					? {
							repeat: {
								pattern: config.schedule.cron,
							},
						}
					: null;

		if (!bullJobConfig) {
			throw new Error("Schedule type not implemented");
		}

		const jobName = `event:${config.instance.kind}:${config.instance.id}:${nanoid()}` as const;
		const job = await this.queue.add(jobName, config, bullJobConfig);
		const scheduleId = this.getScheduleID(job);
		if (!scheduleId) {
			throw new Error("Uh Oh!");
		}

		await this.register(scheduleId, config);

		return scheduleId;
	}

	async remove(scheduleId: string) {
		await Promise.all([
			this.queue.removeRepeatableByKey(scheduleId),
			this.queue.remove(scheduleId),
		]);
	}

	async delete(kind: Adapters.InstanceKind, id: Adapters.InstanceId, scheduleId: string) {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const scheduleRedisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;

		await Promise.all([
			this.remove(scheduleId),
			this.redis.hdel(redisKey, scheduleId),
			this.redis.del(scheduleRedisKey),
		]);

		return true;
	}

	async cancel(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
		scheduleId: string,
	): Promise<boolean> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const rawScheduleMetadata = await this.redis.hget(redisKey, scheduleId);
		if (!rawScheduleMetadata) {
			return false;
		}

		const scheduleMetadata: Adapters.ScheduleEventMetadata = SuperJSON.parse(rawScheduleMetadata);
		scheduleMetadata.canceled = true;

		await Promise.all([
			this.remove(scheduleId),
			this.redis.hset(redisKey, scheduleId, SuperJSON.stringify(scheduleMetadata)),
		]);

		return true;
	}

	async list(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
	): Promise<Adapters.ScheduleEventMetadata[]> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const rawScheduledEvents = await this.redis.hvals(redisKey);

		const scheduledEvents = rawScheduledEvents.map((st) => SuperJSON.parse(st));
		return scheduledEvents as Adapters.ScheduleEventMetadata[];
	}

	async store<Data>(kind: string, id: string, scheduleId: string, data: Data): Promise<true> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;
		await this.redis.lpush(redisKey, SuperJSON.stringify(data));
		return true;
	}

	async get<Data>(kind: string, id: string, scheduleId: string, last?: number): Promise<Data[]> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;

		const fromIncluded = 0;
		const toIncluded = !last ? -1 : last; // -1 = LAST
		const members = await this.redis.lrange(redisKey, fromIncluded, toIncluded);
		return members.map((m) => SuperJSON.parse(m));
	}

	private async register(scheduleId: Adapters.ScheduleId, config: Adapters.ScheduleEventConfig) {
		const metaData: Adapters.ScheduleEventMetadata = {
			config,
			scheduleId: scheduleId,
			created_at: Date.now(),
			canceled: false,
		};
		const { kind, id } = config.instance;
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		await this.redis.hset(redisKey, scheduleId!, SuperJSON.stringify(metaData));
	}
}
