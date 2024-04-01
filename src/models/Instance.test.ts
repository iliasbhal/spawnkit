import * as Spawnkit from "@/.";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { toggle, toggleWithSync } from "../instances/fixtures";
import { InstanceSnapshot, InstanceEvent, InstanceLock } from "../repositories";

describe("Instance", () => {
  const instances = {
    toggle: Machine.from(toggle),
    toggleWithSync: Machine.from(toggleWithSync),
  };

  Spawnkit.Worker.listen({
    instances: Object.values(instances),
  });

  beforeAll(async () => {
    await InstanceEvent.reset();
  });

  it("should only one live actor per actorId", async () => {
    const initialInst = new instances.toggle();
    await initialInst.run();

    const instantiateAttempt = async () => {
      const actorInst = new instances.toggle({
        id: initialInst.id,
      });

      const response = await actorInst.run();
      return response;
    };

    const results = await Promise.allSettled([
      instantiateAttempt(),
      instantiateAttempt(),
      instantiateAttempt(),
    ]);

    const fulfilled = results.filter((result) => result.status == "fulfilled");
    const rejected = results.filter((result) => result.status == "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    rejected.forEach((result) => {
      if (result.status !== "rejected")
        throw new Error("should have been rejected");
      expect(result.reason).toBeInstanceOf(InstanceLock.LockError);
      expect(result.reason.message).toMatch("Couldn't acquire lock");
    });
  }, 10000);

  it("can subscribe to actor new snapshots", async () => {
    const actorInst = new instances.toggle();
    await actorInst.run();
    await InstanceEvent.sendEventToActor({
      actor: {
        kind: "toggle",
        id: actorInst.id,
      },
      event: {
        type: "TOGGLE",
      },
    });

    const promise = new ControlledPromise();
    const subscription = InstanceSnapshot.subscribeToActorSnapshot<any>(
      { kind: "toggle", id: actorInst.id },
      (data) => {
        if (data.value === "FALSE") {
          promise.resolve(true);
        }
      },
    );

    promise.await.finally(() => subscription.unsubscribe());
    await expect(promise.await).resolves.toBe(true);
  });

  it.todo("should not call onEvent is instance .stop() has been called");
});
