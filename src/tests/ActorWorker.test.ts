import * as x from "xstate";
import * as Spawnkit from "../";
import { MachineActorInstance } from "../instances";

describe("Worker", () => {
  it("should not allow several machines with the same meta.kind", () => {
    const first = MachineActorInstance.from(
      x.createMachine({
        meta: { kind: "first" },
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    const second = MachineActorInstance.from(
      x.createMachine({
        meta: { kind: "first" },
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    expect(() =>
      Spawnkit.Worker.listen({ instances: [first, second] }),
    ).toThrow();
  });

  it("should allow several machines when all have different meta.kind", () => {
    const first = MachineActorInstance.from(
      x.createMachine({
        meta: { kind: "first" },
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    const second = MachineActorInstance.from(
      x.createMachine({
        meta: { kind: "second" },
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    expect(() =>
      Spawnkit.Worker.listen({ instances: [first, second] }),
    ).not.toThrow();
  });

  it("should not a machines doesn't provide a meta.kind", () => {
    const first = MachineActorInstance.from(
      x.createMachine({
        meta: {},
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    const second = MachineActorInstance.from(
      x.createMachine({
        meta: { kind: "second" },
        initial: "1",
        states: {
          "1": {},
          "2": {},
        },
      }),
    );

    expect(() =>
      Spawnkit.Worker.listen({ instances: [first, second] }),
    ).toThrow();
  });
});
