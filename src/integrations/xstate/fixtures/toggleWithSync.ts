import * as x from "xstate";

export const toggleWithSync = x.createMachine({
	initial: "TRUE",
	meta: {
		kind: "toggleWithSync",
		sync: jest.fn(),
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
