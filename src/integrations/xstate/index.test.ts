import wait from "wait";
import { Machine } from "../instances";
import { toggle, toggleWithSync, createInvokeMachine } from "./fixtures";
import { InstanceSnapshot, InstanceEvent } from "../repositories";
import * as Spawnkit from "..";

describe("Instance", () => {
  const stubs = {
    sync: jest.fn(),
    delayedInvoke: jest.fn().mockImplementation(async () => await wait(1000)),
    invokeResolve: jest.fn().mockImplementation(async () => true),
    invokeReject: jest.fn().mockImplementation(async () => {
      throw false;
    }),
  };

  const withInvokeResolved = createInvokeMachine("withInvokeResolved", {
    sync: stubs.sync,
    invoke: stubs.invokeResolve,
  });

  const withInvokeRejected = createInvokeMachine("withInvokeRejected", {
    sync: stubs.sync,
    invoke: stubs.invokeReject,
  });

  const withDelayedInvoke = createInvokeMachine("withDelayedInvoke", {
    sync: stubs.sync,
    invoke: stubs.delayedInvoke,
  });

  const instances = {
    toggle: Machine.from(toggle),
    toggleWithSync: Machine.from(toggleWithSync),
    withInvokeResolved: Machine.from(withInvokeResolved),
    withInvokeRejected: Machine.from(withInvokeRejected),
    withDelayedInvoke: Machine.from(withDelayedInvoke),
  };

  const worker = Spawnkit.Worker.listen({
    instances: Object.values(instances),
  });

  beforeAll(async () => {
    await InstanceEvent.reset();
  });

  beforeEach(() => {
    Object.values(stubs).forEach((stub) => {
      stub.mockClear();
    });
  });

  it("can instantiate basic actor machine", async () => {
    const actorInst = new instances.toggle();
    const { data, stale } = await actorInst.run();

    expect(stale).toBe(false);
    expect(data).toMatchObject({
      status: "stopped",
      value: "TRUE",
    });
  });

  it("should save the snapshot to the database", async () => {
    const actorInst = new instances.toggle();
    const { data } = await actorInst.run();

    const storedSnapshot: any = await InstanceSnapshot.getActorSnapshot(
      actorInst.id,
    );
    const stored = JSON.parse(JSON.stringify(storedSnapshot));
    const expected = JSON.parse(JSON.stringify(data));
    expect(stored).toEqual(expected);
  });

  it("should trigger meta.sync whenever actor changes", async () => {
    const actorInst = new instances.toggleWithSync();
    const { data } = await actorInst.run();

    expect(toggleWithSync.config.meta.sync).toHaveBeenCalled();
  });

  it("should wait until invoked promises is complete", async () => {
    const beforeInvokeDone = new Promise((resolve) => {
      setTimeout(() => {
        expect(stubs.invokeResolve).toHaveBeenCalled();
        resolve(true);
      }, 900);
    });

    const actorInst = new instances.withInvokeResolved();
    const { data } = await actorInst.run();

    expect(stubs.invokeResolve).toHaveBeenCalledTimes(1);
    expect(data).toMatchObject({
      status: "done", // when state is type:final -> status should be "done",
      value: "COMPLETED", // The name of the state is "COMPLETED"
    });

    await beforeInvokeDone; // Just to ensure it ran properly;
  });

  it("should wait until invoked promises is error", async () => {
    const actorInst = new instances.withInvokeRejected();
    const { data } = await actorInst.run();

    expect(stubs.invokeReject).toHaveBeenCalled();
    expect(data).toMatchObject({
      status: "done", // when state is type:final -> status should be "done",
      value: "ERRORED", // The name of the state is "ERRORED"
    });
  });

  it.todo(
    "should not emit a new snaphot when actor is reconstrctued with a snapshot",
  );
});
