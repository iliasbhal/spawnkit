import { InstanceKind } from "@/adapters";
import * as x from "xstate";

export const createInvokeMachine = (
	kind: InstanceKind,
	config: {
		sync?: Function;
		invoke: () => Promise<any>;
	},
): x.AnyStateMachine =>
	x
		.setup({
			actors: {
				ppp: x.fromPromise(config.invoke),
			},
		})
		.createMachine({
			meta: {
				kind: kind,
				sync: config.sync,
			},
			initial: "LOADING",
			states: {
				LOADING: {
					invoke: {
						onDone: "COMPLETED",
						onError: "ERRORED",
						src: "ppp",
					},
				},
				COMPLETED: {
					type: "final",
				},
				ERRORED: {
					type: "final",
				},
			},
		});
