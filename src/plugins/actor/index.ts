import * as x from "xstate";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { InstancePlugin } from "../InstancePlugin";
import { Volume } from '../volume';
import { MockVolume } from '../volume/LocalVolume';
import { AsyncQueue } from "@/utils/AsyncQueue";

type MachineEvent<M extends x.AnyStateMachine> = Parameters<
	ReturnType<typeof x.createActor<M>>["send"]
>[0];

type MachineData<M extends x.AnyStateMachine> = ReturnType<
	ReturnType<typeof x.createActor<M>>["getPersistedSnapshot"]
>;

interface PluginConfig<T extends x.AnyStateMachine = x.AnyStateMachine> {
	id?: string;
	machine: T;
	onSnapshot?: (data: { actorId: string; snapshot: MachineData<T> }) => void;
}

export class Actor<StateMachine extends x.AnyStateMachine = x.AnyStateMachine> extends InstancePlugin {
	private machine: StateMachine = null as any;
	private actor: x.Actor<StateMachine> = null as any;
	private actorByActorId = new Map<string, x.AnyActorRef>();
	private subscriptonByActor = new Map<string, x.Subscription>();
	private snapshotByActorId = new Map<string, MachineData<StateMachine>>();

	public async initialize(input?: any) {
		await this.getOrInitializeActor(input);
		const snapshot = await this.getSnapshot();
		return snapshot
	}

	public async send(event: MachineEvent<StateMachine>, init?: any) {
		await this.getOrInitializeActor(init);
		this.actor.send(event);
		const snapshot = this.actor.getSnapshot();
		return snapshot;
	};

	public async getSnapshot() {
		await this.getOrInitializeActor();
		return this.actor.getSnapshot();
	}


	// Promise to track initialization status and prevent race conditions
	private getActorPromise: Promise<x.Actor<StateMachine>> | null = null;

	/**
	 * Ensures the actor is initialized, handling potential race conditions
	 * by using a shared initialization Promise
	 */
	private async getOrInitializeActor(input?: any): Promise<x.Actor<StateMachine>> {
		if (!this.getActorPromise) {
			this.getActorPromise = Promise.resolve()
				.then(() => this.initializeActor({ input }))
				.catch((error) => {
					this.getActorPromise = null;
					throw error;
				});
		}

		const actor = await this.getActorPromise;
		return actor;
	}

	private volume: Volume;
	private config: PluginConfig<StateMachine>;

	constructor(config: PluginConfig<StateMachine>) {
		super();
		this.machine = config.machine;
		this.config = config;


		this.volume = new MockVolume({
			name: 'xstate/' + this.getActorName()
		});
	}

	getActorName() {
		return this.config.id || 'machine'
	}

	private async initializeActor(config: { input?: any }) {
		try {
			const snapshot = await this.readSnapshot();

			this.actor = x.createActor(this.machine, {
				...config,
				snapshot,
				id: this.getActorName(),
				inspect: (inspectionEvent) => {
					switch (inspectionEvent.type) {
						// case "@xstate.event":
						// 	return this.handleActorEvent(inspectionEvent);
						case "@xstate.actor":
							return this.handleChildActorCreateEvent(inspectionEvent);
						case "@xstate.snapshot":
							return this.handleSnapshot(inspectionEvent);
					}
				},
			});

			this.actor.start();

			return this.actor;
		} catch (error) {
			console.error("Failed to initialize actor:", error);
			throw error;
		}
	}

	private async handleSnapshot(inspectionEvent: x.InspectedSnapshotEvent) {
		const actor = inspectionEvent.actorRef as x.Actor<StateMachine>;
		const snapshot = actor.getPersistedSnapshot();

		this.snapshotByActorId.set(actor.id, snapshot);
		await this.writeSnapshot(snapshot);

		// Notify snapshot listeners
		if (this.config.onSnapshot) {
			this.config.onSnapshot({
				actorId: this.actor.id,
				snapshot: snapshot
			});
		}
	}

	private writeQueue: AsyncQueue = new AsyncQueue();
	private async writeSnapshot(snapshot: MachineData<StateMachine>) {
		const willAlreadyWrite = this.writeQueue.waitingCount > 1;
		if (willAlreadyWrite) {
			return;
		}

		this.writeQueue.enqueue(async () => {
			await this.volume.fs.writeJson("snapshot.json", snapshot);
		});
	}

	private async readSnapshot() {
		try {
			const snapshot = await this.volume.fs.readJson("snapshot.json");
			return snapshot;
		} catch (error) {
			// Return undefined if snapshot file doesn't exist yet
			return undefined;
		}
	}

	private childActorDoneByActor = new Map<x.AnyActorRef, ControlledPromise<any>>();
	private async handleChildActorCreateEvent(event: x.InspectedActorEvent) {
		const actor = event.actorRef as x.Actor<any>;

		this.actorByActorId.set(actor.id, actor);

		const isAlreadySubscribed = this.subscriptonByActor.has(actor.id);
		const isRootActor = actor.id === this.getActorName();
		if (isAlreadySubscribed || isRootActor) {
			// Note: Root snapshots are handled directly
			// from handling the snapshot event
			// within the inspect function.
			return;
		}

		const alreadyWaitingOnCompletiong = this.childActorDoneByActor.has(actor);
		if (!alreadyWaitingOnCompletiong) {
			const actorPending = new ControlledPromise(`child actor pending (id: ${actor.id})`);
			this.instance.waitFor(() => actorPending.await);
			this.childActorDoneByActor.set(actor, actorPending);
		}

		this.subscriptonByActor.set(
			actor.id,
			actor.subscribe({
				next: () => {
					const snapshot = actor.getPersistedSnapshot() as MachineData<typeof this.machine>;
					this.snapshotByActorId.set(actor.id, snapshot);

					// Notify snapshot listeners for child actors as well
					if (this.config.onSnapshot) {
						this.config.onSnapshot({
							actorId: actor.id,
							snapshot: snapshot
						});
					}

					const shouldResolve = ["error", "done"].includes(snapshot.status);
					if (shouldResolve) {
						const actorPending = this.childActorDoneByActor.get(actor);
						actorPending?.resolve(true);
					}
				},
				error: (err) => {
					const actorPending = this.childActorDoneByActor.get(actor);
					actorPending?.resolve(err);
				},
				complete: () => {
					const actorPending = this.childActorDoneByActor.get(actor);
					actorPending?.resolve(true);
					// Notify listeners about completion
					if (this.config.onSnapshot) {
						this.config.onSnapshot({
							actorId: actor.id,
							snapshot: actor.getPersistedSnapshot(),
						});
					}
				},
			}),
		);
	}

	// /**
	//  * This method releases the event that we received within onEvent
	//  */
	// private async handleActorEvent(event: x.InspectedEventEvent) {
	// 	const eventData = event.event as MachineEvent<StateMachine>;
	// 	this.actor.send(eventData);
	// }
}
