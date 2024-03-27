import wait from "wait";
import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { Lock } from "./Lock";
import { Adapters, ScheduleData } from "./adapters";

interface InstanceResult<V extends any> {
  data: V | undefined;
  stale: boolean;
}

interface InstanceBase<InstanceData, InstanceEvent> {
  data: InstanceData | null;

  /* This is where you initiate the actor */
  start(): Promise<any>;

  /* Dispose of all the ressources allocated */
  stop(): Promise<any>;

  /* Should return a promise acknowledging the event as processed */
  onEvent(event: InstanceEvent): Promise<any>;
}

export class Instance<InstanceData = any, InstanceEvent = any>
  implements InstanceBase<InstanceData, InstanceEvent>
{
  running: boolean = false;
  keepAlive = new PromiseList();
  aborted = new ControlledPromise("Aborted");
  minLockDurationMs: number = 5_000; // 90sec;

  config: ScheduleData;
  private adapters: Adapters;

  get kind() {
    return this.config.kind;
  }

  get id() {
    return this.config.id;
  }

  constructor(config: ScheduleData, adapters: Adapters) {
    this.config = config;
    this.adapters = adapters;
  }

  /* This is where you initiate the actor */
  async start(): Promise<any> {
    throw new Error("Not implemented");
  }

  /* Dispose of all the ressources allocated */
  async stop(): Promise<any> {
    throw new Error("Not implemented");
  }

  /* Should return a promise acknowledging the event as processed */
  async onEvent(event: InstanceEvent): Promise<any> {
    throw new Error("Not implemented");
  }

  data: InstanceData | null = null;

  saveAsyncManager = new AsyncDebounceHandler();
  async save(data: InstanceData) {
    this.data = data;

    await this.runExternalEffect(async () => {
      await this.saveAsyncManager.onlyLastOnePerTick(async () => {
        await this.adapters.snapshot.set(this.id, data);
      });
    });
  }

  private getLock() {
    const lockConfig = {
      lockId: `redlock:${this.id}`,
      duration: this.minLockDurationMs,
    };

    const lock = new Lock(lockConfig, this.adapters.lock);
    return lock;
  }

  async run(): Promise<InstanceResult<InstanceData | null>> {
    // ids are generated in the application code
    // you can use uuids or any other algorithm to create those.
    if (!this.id) throw new Error("Actor should have an Id");

    // When instantiating a new actor, we should acquire a lock
    // So that only one worker in the cloud is instantiating the actor
    // This is to prevent from executing side effects twice and race conditions.
    const lock = this.getLock();
    const result = await lock.using(async (abortSignal) => {
      // Seed data with previously stored data.
      this.data = await this.adapters.snapshot.get(this.id);

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
    });

    // // In order to make sure that we didn't miss any event and to avoid any race conditions
    // // we'll check if there any event left to process. But we do it outside of the lock.
    // // This will ensure that if there is another process trying to pick up those event
    // // this process doesn't acquire the lock.
    Promise.resolve().then(async () => {
      for (let i = 0; i <= 2; i++) {
        const waitTime = (1 + i) * 200;
        await wait(waitTime);

        const hasUnprocessedEvents = await this.adapters.events.has(this.id);
        if (hasUnprocessedEvents) {
          this.adapters.scheduler.schedule({
            kind: this.kind,
            id: this.id,
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
      throw new Lock.ExtendError(this.id.toString());
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
    const timer = new ControlledTimeout(() => {
      noMoreEventsCtl.resolve(true);
    });

    timer.start(NO_EVENT_TIMEOUT);

    this.onEventSubscription = this.adapters.events.subscribe<InstanceEvent>(
      this.id,
      async (event) => {
        this.keepAlive.addWait(300, "Event Received");
        timer.restart(NO_EVENT_TIMEOUT);

        const fullyProcessEvent = async () => {
          await this.onEvent(event.data);
          await this.adapters.events.ack(this.id, event.id);
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

      const extendLockErr = new Lock.ExtendError(this.id.toString());
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
