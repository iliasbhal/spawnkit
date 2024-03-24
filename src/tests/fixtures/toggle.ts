import * as x from "xstate";

export const toggle = x.createMachine({
  initial: "TRUE",
  meta: {
    kind: "toggle",
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
