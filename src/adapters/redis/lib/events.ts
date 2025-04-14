import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../_common";
import { Serde, BaseQueue } from "./_base";
import { nanoid } from "nanoid";

export class EventScheduler extends BaseQueue implements Adapters.AdapterEventScheduler {
	queue: ReturnType<typeof this.createQueue>;

	constructor(redis: Redis) {
		super(redis);
		this.queue = this.createQueue("events");
	}

	subscribe(callback: (event: Adapters.ScheduleEventConfig, context: { scheduleId: string }) => any) {
		const worker = this.createWorker<Adapters.ScheduleEventConfig>(this.queue, async (job) => {
			const [kind, id, scheduleId] = job.name.split(':').slice(1);
			const canProcess = this.ensureExactlyOnceExcution(kind, id, job);
			if (!canProcess) {
				throw new Error('Job Already Processed');
			};

			const context = {
				scheduleId: scheduleId,
			};

			const data = await this.get(kind, id, scheduleId);
			await callback(data.config, context);
		});

		// worker.run();
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
	private async ensureExactlyOnceExcution(kind: Adapters.InstanceKind, id: Adapters.InstanceId, job: BullMQ.Job<Adapters.ScheduleEventConfig>) {
		const jobKey = `spawnkit:locks:${kind}:${id}:jobs:${job.id}`;
		const executCount = await this.redis.incr(jobKey);
		const hasAlreadyBeenExecuted = executCount > 1;
		if (hasAlreadyBeenExecuted) {
			return false;
		}

		return true;
	}

	getBullJobIdFor(kind: Adapters.InstanceKind, id: Adapters.InstanceId, scheduleId: Adapters.ScheduleId) {
		return `event:${kind}:${id}:${scheduleId}` as const;
	}

	async schedule(config: Adapters.ScheduleEventConfig) {
		if (!config.schedule.id) {
			config.schedule.id = nanoid();
		}


		const scheduleId = config.schedule.id;
		const globalScheduleId = this.getBullJobIdFor(config.instance.kind, config.instance.id, scheduleId);

		const bullJobConfig: BullMQ.JobsOptions =
			"delay" in config.schedule ? { delay: config.schedule.delay, jobId: globalScheduleId, }
				: "cron" in config.schedule ? { repeat: { pattern: config.schedule.cron }, repeatJobKey: globalScheduleId, }
					: null;

		if (!bullJobConfig) {
			throw new Error("Schedule type not implemented");
		}

		await this.queue.add(globalScheduleId, null, bullJobConfig);

		await this.register(scheduleId, config);

		return scheduleId;
	}

	private async remove(kind: Adapters.InstanceKind, id: Adapters.InstanceId, scheduleId: string) {
		const globalScheduleId = this.getBullJobIdFor(kind, id, scheduleId);

		await Promise.all([
			this.queue.removeRepeatableByKey(globalScheduleId),
			this.queue.remove(globalScheduleId),
		]);
	}

	async delete(kind: Adapters.InstanceKind, id: Adapters.InstanceId, scheduleId: string) {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const scheduleRedisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;

		await Promise.all([
			this.remove(kind, id, scheduleId),
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

		const scheduleMetadata: Adapters.ScheduleEventMetadata = await Serde.deserialize(rawScheduleMetadata);
		scheduleMetadata.canceled = true;
		const serialized = await Serde.serialize(scheduleMetadata)

		await Promise.all([
			this.remove(kind, id, scheduleId),
			this.redis.hset(redisKey, scheduleId, serialized),
		]);

		return true;
	}

	async list(
		kind: Adapters.InstanceKind,
		id: Adapters.InstanceId,
	): Promise<Adapters.ScheduleEventMetadata[]> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const rawScheduledEvents = await this.redis.hvals(redisKey);

		const scheduledEvents = await Promise.all(
			rawScheduledEvents.map(
				async (st) => await Serde.deserialize<Adapters.ScheduleEventMetadata>(st)
			)
		);

		return scheduledEvents.sort((eventA, eventB) => {
			return eventA.created_at - eventB.created_at;
		})
	}

	async store<Data>(kind: string, id: string, scheduleId: string, data: Data): Promise<true> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;
		const serialized = await Serde.serialize(data)
		await this.redis.lpush(redisKey, serialized);
		return true;
	}

	async get<Data extends Adapters.ScheduleEventMetadata>(kind: Adapters.InstanceKind, id: Adapters.InstanceId, scheduleId: Adapters.ScheduleId, last?: number): Promise<Data> {
		const redisKey = `spawnkit:scheduled:${kind}:${id}:index`;
		const rawScheduleMetadata = await this.redis.hget(redisKey, scheduleId);
		if (!rawScheduleMetadata) {
			return null;
		}

		const scheduleJob = await Serde.deserialize<Data>(rawScheduleMetadata)
		return scheduleJob;
	}

	async runs<Data>(kind: string, id: string, scheduleId: string, last?: number): Promise<Data[]> {
		const scheduleIdKey = `spawnkit:scheduled:${kind}:${id}:status:${scheduleId}`;

		const fromIncluded = 0;
		const toIncluded = !last ? -1 : last; // -1 = LAST
		const members = await this.redis.lrange(scheduleIdKey, fromIncluded, toIncluded);

		return await Promise.all(
			members.map((m) => Serde.deserialize<Data>(m))
		);
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
		const serialized = await Serde.serialize(metaData);
		await this.redis.hset(redisKey, scheduleId, serialized);
	}
}
