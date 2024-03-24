import { z } from "zod";
import * as BullMQ from "bullmq";
import { ORM, Actor, ActorEvent, redis } from "../../prisma";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { SendEventToActorProps, CreateEventProps } from "./index.zod";
import { CreateActorEvent, InitializeActorEvent } from "./index.d";

export type ActorLaunchConfig = CreateActorEvent | InitializeActorEvent;
export type ActorConfig = CreateActorEvent & InitializeActorEvent;

export class InstanceEvent {
  private static Queue = new BullMQ.Queue("ActorScheduler", {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  static async reset() {
    await InstanceEvent.Queue.drain();
  }

  static getJobId(actorConfig: ActorLaunchConfig): string | undefined {
    if ("id" in actorConfig) {
      // `bullmq` will discard job with same ids
      // We leverage this behaviour to ensure we don't schedule
      // actors instance if they  that are already in the pipeline
      const periodId = (Date.now() / 100).toFixed(0);
      const jobId = `${actorConfig.kind}:${actorConfig.id}:${periodId}`;
      return jobId;
    }

    return undefined;
  }

  static async schedule(
    actorConfig: ActorLaunchConfig,
    opts: BullMQ.JobsOptions = {},
  ) {
    const queuedJob = await InstanceEvent.Queue.add("event", actorConfig, {
      jobId: InstanceEvent.getJobId(actorConfig),
      ...opts,
    });

    return queuedJob;
  }

  static subscribeToNewEvents(
    config: { concurrency: number },
    callback: (actorConfig: ActorLaunchConfig) => any,
  ) {
    const worker = new BullMQ.Worker(
      InstanceEvent.Queue.name,
      async (job) => {
        await callback(job.data);
      },
      {
        autorun: true,
        concurrency: config.concurrency,
        connection: redis,
      },
    );

    return {
      unsubscribe() {
        return worker.close();
      },
    };
  }

  static async createActor(event: z.infer<typeof CreateEventProps>) {
    await InstanceEvent.schedule({
      kind: event.kind,
      input: event.input,
      origin: "create",
    });
  }

  static async sendEventToActor(event: z.infer<typeof SendEventToActorProps>) {
    const [storedEvent, scheduleJob] = await Promise.all([
      InstanceEvent.createActorEvent(event.actor.id, event.event),
      InstanceEvent.schedule({
        kind: event.actor.kind,
        id: event.actor.id,
        origin: "event",
      }),
    ]);

    return storedEvent;
  }

  static async createActorEvent(actorId: number, event: { type: string }) {
    return await ORM.actorEvent.create({
      data: {
        type: event.type,
        data: event,
        actor: {
          connect: {
            id: actorId,
          },
        },
      },
    });
  }

  static async checkActorHasUnprocessedEvents(
    actorId: number,
  ): Promise<boolean> {
    const first = await ORM.actorEvent.findFirst({
      where: {
        actorId: actorId,
        processed: false,
      },
    });

    return !!first;
  }

  static async getActorUnprocessedEvents(actorId: number) {
    return await ORM.actorEvent.findMany({
      select: {
        id: true,
        processed: true,
        data: true,
      },
      where: {
        actorId: actorId,
        processed: false,
      },
    });
  }

  static async markEventAsProccessed(eventId: number) {
    return await ORM.actorEvent.update({
      data: {
        processed: true,
        processedAt: new Date(),
      },
      where: {
        id: eventId,
      },
    });
  }

  public static subscribeToActorEvents(
    actorId: Actor["id"],
    onEvent: (
      event: Pick<ActorEvent, "id" | "processed" | "data">,
    ) => void | Promise<void>,
  ) {
    const eventsById = new Set();

    const subscription = ControlledInterval.new({
      pollInterval: 100,
      getValue: () => InstanceEvent.getActorUnprocessedEvents(actorId),
      onChange: async (events) => {
        if (!events || events.length == 0) {
          return;
        }

        const newEvents = events.filter((event) => !eventsById.has(event.id));
        newEvents.forEach((event) => eventsById.add(event.id));

        for (const event of newEvents) {
          if (!subscription.live) break;

          await onEvent(event);
        }
      },
    });

    return subscription;
  }
}
