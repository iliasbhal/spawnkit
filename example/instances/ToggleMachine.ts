import { setup } from "xstate";
import { MachineInstance } from "./MachineInstance";

const machine = setup({
  types: {
    events: {} as { type: "TOGGLE" },
    context: {} as { count: number },
  },
}).createMachine({
  initial: "initial",
  context: {
    count: 0,
  },
  states: {
    TRUE: {
      on: {
        TOGGLE: "FALSE",
      },
    },
    FALSE: {
      on: {
        TOGGLE: "TRUE",
      },
    },
  },
});

export const ToggleMachine = MachineInstance.from(machine, {
  sync: (actor) => {
    const data = actor.getSnapshot();
  },
});
