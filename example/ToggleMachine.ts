import { Machine } from "@/integrations/xstate";
import { setup } from "xstate";

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

export const ToggleMachine = Machine.from(machine, {
  sync: (actor) => {
    const data = actor.getSnapshot();
  },
});
