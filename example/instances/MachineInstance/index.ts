import * as x from "xstate";
import { ControlledPromise } from "@/utils/ControlledPromise";
import * as Spawnkit from "@/.";

type MachineEvent<M extends x.AnyStateMachine> = Parameters<
  ReturnType<typeof x.createActor<M>>["send"]
>[0];

type MachineSnapshot<M extends x.AnyStateMachine> = ReturnType<
  ReturnType<typeof x.createActor<M>>["getPersistedSnapshot"]
>;

export class MachineInstance<
  Machine extends x.AnyStateMachine,
> extends Spawnkit.Instance<MachineSnapshot<Machine>, MachineEvent<Machine>> {
  machine: Machine = null as any;
  sync?: (actor: x.Actor<typeof this.machine>) => any;
  actor: x.Actor<Machine> = null as any;
  actorByActorId = new Map<string, x.AnyActorRef>();
  subscriptonByActor = new Map<string, x.Subscription>();
  snapshotByActorId = new Map<string, MachineSnapshot<Machine>>();

  static from<Machine extends x.AnyStateMachine>(
    machine: Machine,
    config?: { sync?: MachineInstance<typeof machine>["sync"] },
  ) {
    // simply preconfigure the class with the machine object
    return class extends MachineInstance<typeof machine> {
      machine = machine;
      sync = config?.sync;
    };
  }

  async stop() {
    this.actor.stop();
  }

  eventProcessing = new Map<MachineEvent<Machine>, ControlledPromise<true>>();
  async onEvent(event: MachineEvent<Machine>) {
    const eventProcessed = new ControlledPromise<true>();

    this.eventProcessing.set(event, eventProcessed);
    this.actor.send(event);

    return eventProcessed.await;
  }

  async start() {
    this.actor = this.createActor();
    this.actor.start();
  }

  private createActor() {
    return x.createActor(this.machine, {
      snapshot: this.data as any,
      input: this.config.input,
      id: `${this.id}`,
      inspect: (inspectionEvent) => {
        switch (inspectionEvent.type) {
          case "@xstate.event":
            return this.handleIncomingEvent(inspectionEvent);
          case "@xstate.actor":
            return this.handleChildActorCreateEvent(inspectionEvent);
          case "@xstate.snapshot":
            return this.handleSnapshot();
        }
      },
    });
  }

  private async handleSnapshot() {
    const snapshot =
      this.actor.getPersistedSnapshot() as MachineSnapshot<Machine>;
    this.snapshotByActorId.set(this.actor.id, snapshot);
    this.save(snapshot);

    this.runExternalEffect(async () => {
      await this.sync?.(this.actor);
    }, `handleActorCreatedEvent/rootActor`);
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
      const pending = this.keepAlive.addControlled(
        `child actor pending (id: ${actor.id})`,
      );
      this.childActorDoneByActor.set(actor, pending);
    }

    this.subscriptonByActor.set(
      actor.id,
      actor.subscribe({
        next: () => {
          const snapshot = actor.getPersistedSnapshot();
          this.runExternalEffect(async () => {
            this.snapshotByActorId.set(
              actor.id,
              snapshot as MachineSnapshot<Machine>,
            );
            const shouldResolve = ["error", "done"].includes(snapshot.status);
            if (shouldResolve) {
              const pending = this.childActorDoneByActor.get(actor);
              pending?.resolve(true);
            }
          }, `handleChildActorCreateEvent/shildActor`);
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
  private async handleIncomingEvent(event: x.InspectedEventEvent) {
    const eventData = event.event as MachineEvent<Machine>;
    const isExternaEventBeeingProcessed = this.eventProcessing.has(eventData);
    if (isExternaEventBeeingProcessed) {
      const isProcessedCtl = this.eventProcessing.get(eventData)!;
      isProcessedCtl.resolve(true);
    }
  }
}
