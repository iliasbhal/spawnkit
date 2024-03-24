import wait from "wait";
import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { ControlledTimer } from "@/utils/ControlledTimer";
import {
  InstanceSnapshot,
  InstanceEvent,
  InstanceLock,
  ActorConfig,
} from "./repositories";

interface InstanceResult<V extends any> {
  data: V | undefined;
  stale: boolean;
}

export class Instance<Data = any, Event = any> {
  running: boolean = false;
  keepAlive = new PromiseList();
  aborted = new ControlledPromise("Aborted");
  minLockDurationMs: number = 5_000; // 90sec;
  config!: ActorConfig;

  get kind() {
    return this.config.kind;
  }

  get id() {
    return this.config.id;
  }

  constructor(actorConfig: ActorConfig) {
    this.config = actorConfig;
  }

  static kind = "default";

  /* This is where you initiate the actor */
  protected async start(): Promise<any> {
    throw new Error("Not implemented");
  }

  /* Dispose of all the ressources allocated */
  protected async stop(): Promise<any> {
    throw new Error("Not implemented");
  }

  /* Should return a promise acknowledging the event as processed */
  protected async onEvent(event: Event): Promise<any> {
    throw new Error("Not implemented");
  }

  data: Data | undefined;

  saveAsyncManager = new AsyncDebounceHandler();
  async save(data: Data) {
    this.data = data;

    await this.runExternalEffect(async () => {
      await this.saveAsyncManager.onlyLastOnePerTick(async () => {
        await InstanceSnapshot.storeActorSnapShot(this.id, data!);
      });
    });
  }

  async setup(config: ActorConfig) {
    const alreadyCreated = "id" in config;
    if (alreadyCreated) {
      this.config.id = config.id;
    } else {
      const newActorId = await InstanceSnapshot.getNewActorId(this.kind);
      this.config.id = newActorId;
    }
  }

  async run(): Promise<InstanceResult<Data>> {
    await this.setup(this.config);
    if (!this.id) throw new Error("Actor should have an Id");

    // When instantiating a new actor, we should acquire a lock
    // So that only one worker in the cloud is instantiating the actor
    // This is to prevent from executing side effects twice and race conditions.
    const result = await InstanceLock.aquireLockAndRun({
      lockKey: `redlock:${this.id}`,
      lockDuration: this.minLockDurationMs,
      callback: async (abortSignal) => {
        // Seed data with previously stored data.
        this.data = await InstanceSnapshot.getActorSnapshot(this.id);

        // Start the process + start listening for events
        this.running = true;
        const current = this.start();
        this.keepAlive.add(current);
        this.keepAlive.add(this.subscribeToActorEvent());

        const syncAbort = this.syncAbortSignalWithPromise(abortSignal);
        this.aborted.await.finally(() => {
          this.keepAlive.clear();
          syncAbort.dispose();
          this.stopRun();
        });

        await this.keepAliveUntilNothingHappens().finally(() => {
          syncAbort.dispose();
        });

        return {
          data: this.data,
          stale: false,
        };
      },
    });

    // // In order to make sure that we didn't miss any event and to avoid any race conditions
    // // we'll check if there any event left to process. But we do it outside of the lock.
    // // This will ensure that if there is another process trying to pick up those event
    // // this process doesn't acquire the lock.
    Promise.resolve().then(async () => {
      for (let i = 0; i <= 2; i++) {
        const waitTime = (1 + i) * 200;
        await wait(waitTime);

        const hasUnprocessedEvents =
          await InstanceEvent.checkActorHasUnprocessedEvents(this.id);

        if (hasUnprocessedEvents) {
          InstanceEvent.schedule({
            kind: this.config.kind,
            id: this.id,
            origin: "leftover",
          });
        }
      }
    });

    return result;
  }

  async stopRun() {
    if (!this.running) return;
    this.running = false;
    this.onEventSubscription?.unsubscribe();
    await this.stop();
  }

  protected async waitOnExternalEffects() {
    await this.keepAlive.waitOnAll();
    if (this.aborted.fulfilled) {
      throw new InstanceLock.ExtendError(this.id.toString());
    }
  }

  get live() {
    if (!this.running) return false;
    if (this.keepAlive.fulfilled) return false;
    if (this.aborted.fulfilled) return false;
    return true;
  }

  protected async runExternalEffect<T>(
    callback: () => Promise<T>,
    name?: string,
  ): Promise<void> {
    if (this.aborted.fulfilled) {
      // silence attempt
      return;
    }

    const pending = this.keepAlive.addControlled(
      `External: ${name || "no-name"}`,
    );

    Promise.resolve()
      .then(callback)
      .then(() => pending.resolve(true))
      .catch((err) => pending.reject(err));

    await pending.await;
  }

  private onEventSubscription: { unsubscribe: Function } | undefined;
  private subscribeToActorEvent() {
    const noMoreEventsCtl = new ControlledPromise();

    const NO_EVENT_TIMEOUT = 3000;
    const timer = new ControlledTimer(() => {
      noMoreEventsCtl.resolve(true);
    });

    timer.start(NO_EVENT_TIMEOUT);

    this.onEventSubscription = InstanceEvent.subscribeToActorEvents(
      this.id,
      async (event) => {
        this.keepAlive.addWait(300, "Event Received");
        timer.restart(NO_EVENT_TIMEOUT);

        const fullyProcessEvent = async () => {
          const eventContent = event.data as any;
          await this.onEvent(eventContent);
          await InstanceEvent.markEventAsProccessed(event.id);
        };

        const waitUntilFullyProcessed = fullyProcessEvent();
        this.keepAlive.add(waitUntilFullyProcessed);
        await waitUntilFullyProcessed;
      },
    );

    return noMoreEventsCtl.await;
  }

  private syncAbortSignalWithPromise(abortCtl: AbortSignal) {
    const onAbortCallback = () => {
      if (!this.live) {
        return;
      }

      const extendLockErr = new InstanceLock.ExtendError(this.id.toString());
      this.aborted.resolve(extendLockErr);
    };

    abortCtl.addEventListener("abort", onAbortCallback);
    this.aborted.await.finally(() => {
      abortCtl.removeEventListener("abort", onAbortCallback);
    });

    return {
      dispose: () => {
        abortCtl.removeEventListener("abort", onAbortCallback);
      },
    };
  }

  protected async keepAliveUntilNothingHappens() {
    await this.keepAlive.waitOnAll();
    await this.stopRun();

    // When we call .stop() there is a new snapshot that is generated
    // we should wait for newly created operation to complete
    // before yielding the promise. It the equivalent of a gracefull shutdown
    await this.keepAlive.waitOnAll();
  }
}
