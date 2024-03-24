import { z } from "zod";
import { StateValue } from "xstate";
import { waitFor } from "poll-until-promise";
import { ORM } from "../../prisma";
import { InstanceSnapshot, InstanceEvent } from "../repositories";

import * as Spawnkit from "../";
import { SendEvent } from "../repositories/index.zod";
import { toggle, toggleWithSync } from "./fixtures";
import { Machine } from "../instances";

describe("ActorRepository", () => {
  const instances = {
    toggle: Machine.from(toggle),
    toggleWithSync: Machine.from(toggleWithSync),
  };

  Spawnkit.Worker.listen({ instances: Object.values(instances) });

  beforeAll(async () => {
    await InstanceEvent.reset();
  });

  it("should be able to send events to an actor", async () => {
    const actorInst = new instances.toggle();
    await actorInst.run();

    sendEvent(actorInst.id, { type: "TOGGLE" });
    const snapshot = await waitForExpectedSnapshot(actorInst.id, "FALSE");
    expect(snapshot).toMatchObject({
      value: "FALSE",
    });

    sendEvent(actorInst.id, { type: "TOGGLE" });
    const snapshot2 = await waitForExpectedSnapshot(actorInst.id, "TRUE");
    expect(snapshot2).toMatchObject({
      value: "TRUE",
    });
  });

  it("should maintain `processed` attribute of stored events", async () => {
    const actorInst = new instances.toggle();
    await actorInst.run();

    await Promise.all([
      sendEvent(actorInst.id, { type: "TOGGLE" }),
      sendEvent(actorInst.id, { type: "TOGGLE" }),
      sendEvent(actorInst.id, { type: "TOGGLE" }),
    ]);

    await waitForAllProcessed(actorInst.id);

    const storedEvents = await ORM.actorEvent.findMany({
      where: {
        actorId: actorInst.id,
      },
    });

    expect(storedEvents).toHaveLength(3);
    storedEvents.every((event: any, i) => {
      expect(event).toMatchObject({
        processed: true,
        data: { type: "TOGGLE" },
      });

      expect(event.processedAt).toBeInstanceOf(Date);
      if (i > 0) {
        const prevEvent = storedEvents[i - 1] as any;
        const isInOrder = event.processedAt - prevEvent.processedAt > 0;
        expect(isInOrder).toBe(true);
      }
    });
  });

  it("can process a lot of event happening all at once", async () => {
    const ACTOR_COUNT = 5;
    const EVENTS_PER_ACTORS = 40;
    const actors = await Promise.all(
      Array.from({ length: ACTOR_COUNT }).map(async () => {
        const actorInst = new instances.toggle();
        await actorInst.run();

        return actorInst;
      }),
    );

    await Promise.all(
      actors.map(async (actorInst) => {
        await Promise.all(
          Array.from({ length: EVENTS_PER_ACTORS }).map(() =>
            sendEvent(actorInst.id, { type: "TOGGLE" }),
          ),
        );

        await waitForAllProcessed(actorInst.id);

        expect(true).toBe(true);
      }),
    );
  }, 8000);
});

const sendEvent = async (actorId: number, event: z.infer<typeof SendEvent>) => {
  return await InstanceEvent.sendEventToActor({
    actor: {
      kind: "toggle",
      id: actorId,
    },
    event: event,
  });
};

const waitForExpectedSnapshot = async (
  actorId: number,
  expectedValue: StateValue,
) => {
  return await waitFor(
    async () => {
      const snapshot: any = await InstanceSnapshot.getActorSnapshot(actorId);
      const isExpectedValue = snapshot.value == expectedValue;
      if (!isExpectedValue) throw new Error("POLL AGAIN");
      return snapshot;
    },
    { timeout: 60_000, interval: 100 },
  );
};

const waitForAllProcessed = async (actorId: number) => {
  return await waitFor(
    async () => {
      const hasUnproccessedEvents =
        await InstanceEvent.checkActorHasUnprocessedEvents(actorId);

      if (hasUnproccessedEvents) throw new Error("POLL AGAIN");
      return !hasUnproccessedEvents;
    },
    { timeout: 60_000, interval: 300 },
  );
};
