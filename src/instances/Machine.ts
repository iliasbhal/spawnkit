import * as x from "xstate";
import { ControlledPromise } from "@/utils/ControlledPromise";
import * as Spawnkit from "..";
import { ScheduleData, Adapters } from "@/adapters";

type AnySnapshot = x.Snapshot<x.AnyStateMachine>;
type AnyEvent = x.AnyEventObject;

export class Machine extends Spawnkit.Instance<AnySnapshot, AnyEvent> {
  machine: x.AnyStateMachine = null as any;
  actor: x.Actor<x.AnyStateMachine> = null as any;
  actorByActorId = new Map<string, x.AnyActorRef>();
  subscriptonByActor = new Map<string, x.Subscription>();
  snapshotByActorId = new Map<string, AnySnapshot>();

  static getKind(machine: any): string {
    return machine.meta?.kind || machine.config.meta?.kind;
  }

  static from(machine: x.AnyStateMachine) {
    const kind = Machine.getKind(machine);
    if (!kind) {
      throw new Error(
        "Machine Validation: Each machine should have a meta.kind",
      );
    }

    return class MachineInstance extends Machine {
      static kind = kind;
      machine = machine;

      constructor(config: Omit<ScheduleData, "kind">, adapters: Adapters) {
        super(
          {
            ...config,
            kind: kind,
          },
          adapters,
        );
      }
    };
  }

  async stop() {
    this.actor.stop();
  }

  eventProcessing = new Map<x.AnyEventObject, ControlledPromise<true>>();
  async onEvent(event: x.AnyEventObject) {
    const eventProcessed = new ControlledPromise<true>();

    this.eventProcessing.set(event, eventProcessed);
    this.actor.send(event);

    return eventProcessed.await;
  }

  async start() {
    const actor = x.createActor(this.machine, {
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

    this.actor = actor;
    this.actor.start();
  }

  private async handleSnapshot() {
    const snapshot = this.actor.getPersistedSnapshot() as AnySnapshot;
    this.snapshotByActorId.set(this.actor.id, snapshot);
    this.save(snapshot);

    this.runExternalEffect(async () => {
      await this.machine.config.meta?.sync?.(this.actor);
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
          const snapshot = actor.getPersistedSnapshot() as AnySnapshot;
          this.runExternalEffect(async () => {
            this.snapshotByActorId.set(actor.id, snapshot);
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
    const isExternaEventBeeingProcessed = this.eventProcessing.has(event.event);
    if (isExternaEventBeeingProcessed) {
      const isProcessedCtl = this.eventProcessing.get(event.event)!;
      isProcessedCtl.resolve(true);
    }
  }
}
