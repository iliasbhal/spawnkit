import * as x from "xstate";
import { ControlledPromise } from "@/utils/ControlledPromise";
import * as Spawnkit from "../../../src";

type MachineEvent<M extends x.AnyStateMachine> = Parameters<
	ReturnType<typeof x.createActor<M>>["send"]
>[0];

type MachineData<M extends x.AnyStateMachine> = ReturnType<
	ReturnType<typeof x.createActor<M>>["getPersistedSnapshot"]
>;

export class Machine<
	StateMachine extends x.AnyStateMachine = x.AnyStateMachine,
> extends Spawnkit.Instance<{ snapshot: MachineData<StateMachine> }> {
	machine: StateMachine = null as any;
	sync?: (actor: x.Actor<typeof this.machine>) => any;
	actor: x.Actor<StateMachine> = null as any;
	actorByActorId = new Map<string, x.AnyActorRef>();
	subscriptonByActor = new Map<string, x.Subscription>();
	snapshotByActorId = new Map<string, MachineData<StateMachine>>();

	static from<StateMachine extends x.AnyStateMachine>(config: {
		sync?: Machine<StateMachine>["sync"];
		machine: StateMachine;
	}) {
		// simply preconfigure the class with the machine object
		return class extends Machine<StateMachine> {
			machine = config.machine;
			sync = config?.sync;
		};
	}

	private eventProcessing = new Map<MachineEvent<StateMachine>, ControlledPromise<true>>();

	public async send(event: MachineEvent<StateMachine>) {
		const actor = await this.ensureInitializedActor();
		const eventProcessed = new ControlledPromise<true>();

		this.eventProcessing.set(event, eventProcessed);
		actor.send(event);

		await eventProcessed.await;
		return actor.getSnapshot();
	}

	initializedWithInput = false;

	public async init(input: Exclude<Parameters<StateMachine["getInitialSnapshot"]>[1], undefined>) {
		const snapshot = await this.data.get("snapshot");
		if (snapshot) {
			throw new Error("Cannot Create Actor Already Created");
		}

		const actor = await this.getOrInitializeActor(async () => {
			this.initializedWithInput = true;
			return { input };
		});

		return actor.getSnapshot();
	}

	initializedWithSnapshot = false;
	private async ensureInitializedActor() {
		const actor = await this.getOrInitializeActor(async () => {
			this.initializedWithSnapshot = true;
			const snapshot = await this.data.get("snapshot");
			return { snapshot };
		});

		return actor;
	}

	private actorPromise: ControlledPromise<Awaited<ReturnType<typeof this.initializeActor>>> | null =
		null;

	private async getOrInitializeActor(getConfig: () => Promise<any>) {
		if (this.actorPromise) {
			return this.actorPromise.await;
		}

		this.actorPromise = new ControlledPromise<Awaited<ReturnType<typeof this.initializeActor>>>();

		const initConfig = await getConfig();
		this.initializeActor(initConfig)
			.then((actor) => {
				this.actor = actor;
				this.actor.start();
				this.actorPromise?.resolve(actor);
			})
			.catch((err) => {
				this.actorPromise?.reject(err);
			});

		return this.actorPromise.await;
	}

	private async initializeActor(config: { snapshot?: any; input?: any }) {
		return x.createActor(this.machine, {
			...config,
			id: `${this.id}`,
			inspect: (inspectionEvent) => {
				switch (inspectionEvent.type) {
					case "@xstate.event":
						return this.handleActorEvent(inspectionEvent);
					case "@xstate.actor":
						return this.handleChildActorCreateEvent(inspectionEvent);
					case "@xstate.snapshot":
						return this.handleSnapshot();
				}
			},
		});
	}

	skippedInitialSnapshot = false;
	private async handleSnapshot() {
		const snapshot = this.actor.getPersistedSnapshot();
		this.snapshotByActorId.set(this.actor.id, snapshot);

		// We should emitting a new snapshot event only when the actor is created or when a transition happens.
		// or when state or context changed. Not when the actor is recosturcted with a snapshot.
		// This is because there is no new data. We only emit when there is new data basicaly.
		const shouldSkipFirstSnapshotEmit =
			this.initializedWithSnapshot && !this.skippedInitialSnapshot;
		if (shouldSkipFirstSnapshotEmit) {
			this.skippedInitialSnapshot = true;
			return;
		}

		await this.data.set("snapshot", snapshot).then(() => this.sync?.(this.actor));
	}

	childActorDoneByActor = new Map<x.AnyActorRef, ControlledPromise<any>>();
	private async handleChildActorCreateEvent(event: x.InspectedActorEvent) {
		const actor = event.actorRef;
		this.actorByActorId.set(actor.id, actor);

		const isAlreadySubscribed = this.subscriptonByActor.has(actor.id);
		const isRootActor = actor.id === `${this.id}`;
		if (isAlreadySubscribed || isRootActor) {
			// Note: Root snapshots are handled directly
			// from handling the snapshot event
			// within the inspect function.
			return;
		}

		const alreadyWaitingOnCompletiong = this.childActorDoneByActor.has(actor);
		if (!alreadyWaitingOnCompletiong) {
			const actorPending = new ControlledPromise(`child actor pending (id: ${actor.id})`);
			this.waitFor(actorPending.await);
			this.childActorDoneByActor.set(actor, actorPending);
		}

		this.subscriptonByActor.set(
			actor.id,
			actor.subscribe({
				next: () => {
					const snapshot = actor.getPersistedSnapshot() as MachineData<typeof this.machine>;
					this.snapshotByActorId.set(actor.id, snapshot);
					const shouldResolve = ["error", "done"].includes(snapshot.status);
					if (shouldResolve) {
						const pending = this.childActorDoneByActor.get(actor);
						pending?.resolve(true);
					}
				},
				error: (err) => {
					const pending = this.childActorDoneByActor.get(actor);
					pending?.resolve(err);
				},
				complete: () => {},
			}),
		);
	}

	/**
	 * This method releases the event that we received within onEvent
	 */
	private async handleActorEvent(event: x.InspectedEventEvent) {
		const eventData = event.event as MachineEvent<StateMachine>;
		const isExternaEventBeeingProcessed = this.eventProcessing.has(eventData);
		if (isExternaEventBeeingProcessed) {
			const isProcessedCtl = this.eventProcessing.get(eventData)!;
			isProcessedCtl.resolve(true);
		}
	}
}
