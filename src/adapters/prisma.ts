import { ORM } from "../../prisma";
import { ControlledInterval } from "@/utils/ControlledInterval";

import { Actor } from "../../prisma";

export interface CreateActorEvent<O extends object = object> {
  kind: string;
  id: Actor["id"];
  input: O;
}

export interface InitializeActorEvent {
  kind: string;
  id: Actor["id"];
}

export type ActorLaunchConfig = CreateActorEvent | InitializeActorEvent;
export type ActorConfig = CreateActorEvent & InitializeActorEvent;

import { Zod } from "../../prisma";
import { z } from "zod";

export const ActorIdentifier = Zod.Actor.pick({ id: true, kind: true });

export const SendEvent = Zod.ActorEvent.pick({
  type: true,
}).and(Zod.ActorEvent.pick({ data: true }).partial({ data: true }));

export const SendEventToActorProps = z.object({
  actor: ActorIdentifier,
  event: SendEvent,
});

export const CreateEventProps = Zod.Actor.pick({ kind: true }).extend({
  input: z.object({}).passthrough(),
});

export class Snapshot {
  static async get<Data>(actorId: number): Promise<Data> {
    const rawActorData = await ORM.actor.findUnique({
      select: {
        snapshot: true,
      },
      where: {
        id: actorId,
      },
    });

    return rawActorData?.snapshot as any as Data;
  }

  static async set<Data extends object>(actorId: number, snapshot: Data) {
    return await ORM.actor.upsert({
      where: {
        id: actorId,
      },
      update: {},
      create: {
        snapshot,
      },
    });
  }

  public static subscribe<Data>(
    actorId: number,
    onSnapshot: (snapshot: Data) => void,
  ) {
    return ControlledInterval.new({
      pollInterval: 10,
      onChange: onSnapshot,
      getValue: async () =>
        await InstanceSnapshot.getActorSnapshot<Data>(actorId),
    });
  }
}

import { z } from "zod";
import { ORM, Actor, ActorEvent, redis } from "../../prisma";
import { ControlledInterval } from "@/utils/ControlledInterval";
import { SendEventToActorProps } from "./index.zod";

export class Event {
  async sendEventToActor(event: z.infer<typeof SendEventToActorProps>) {
    const [storedEvent, scheduleJob] = await Promise.all([
      this.createActorEvent(event.actor.id, event.event),
      this.schedule({
        kind: event.actor.kind,
        id: event.actor.id,
        origin: "event",
      }),
    ]);

    return storedEvent;
  }

  async createActorEvent(actorId: number, event: { type: string }) {
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

  async checkActorHasUnprocessedEvents(actorId: number): Promise<boolean> {
    const first = await ORM.actorEvent.findFirst({
      where: {
        actorId: actorId,
        processed: false,
      },
    });

    return !!first;
  }

  async getActorUnprocessedEvents(actorId: number) {
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

  async markEventAsProccessed(eventId: number) {
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

  public subscribe(
    actorId: Actor["id"],
    onEvent: (
      event: Pick<ActorEvent, "id" | "processed" | "data">,
    ) => void | Promise<void>,
  ) {
    const seenEventIds = new Set();

    const subscription = ControlledInterval.new({
      pollInterval: 100,
      getValue: () => this.getActorUnprocessedEvents(actorId),
      onChange: async (events) => {
        if (!events || events.length == 0) {
          return;
        }

        const newEvents = events.filter((event) => !seenEventIds.has(event.id));
        newEvents.forEach((event) => seenEventIds.add(event.id));

        for (const event of newEvents) {
          if (!subscription.live) break;

          await onEvent(event);
        }
      },
    });

    return subscription;
  }
}
