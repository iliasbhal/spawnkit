import { Machine } from "@/integrations/xstate";
import { setup } from "xstate";

export const ToggleMachine = Machine.from({
  sync: (actor) => {
    const data = actor.getSnapshot();
    console.log("SYNC CALLED");
  },
  machine: setup({
    types: {
      input: {} as [number, number, number],
      events: {} as { type: "TOGGLE" },
      context: {} as { count: number },
    },
  }).createMachine({
    context: {
      count: 0,
    },
    initial: "TRUE",
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
  }),
});
