import { Redis } from "ioredis";
import * as BullMQ from "bullmq";
import * as Adapters from "../../index";
import { BaseQueue } from "./_base";

export class InstanceScheduler
  extends BaseQueue
  implements Adapters.AdapaterInstanceScheduler
{
  queue: BullMQ.Queue<Adapters.ScheduleInstanceData, any, string>;
  constructor(redis: Redis) {
    super(redis);
    this.queue = this.createQueue("instances");
  }

  async schedule(data: Adapters.ScheduleInstanceData) {
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

  subscribe(
    callback: (event: Adapters.ScheduleInstanceData, context: {}) => any,
  ) {
    const worker = new BullMQ.Worker<Adapters.ScheduleInstanceData>(
      this.queue.name,
      async (job) => {
        await callback(job.data, {});
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
}
