import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { AsyncDebounceHandler } from "@/utils/AsyncDebounceHandler";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { Lock } from "./Lock";
import {
  Adapters,
  ScheduleInstanceData,
  InstanceMethodCall,
  EventId,
} from "../adapters";
import { Client } from "./Client";
import { Stream } from "./Stream";

interface InstanceResult<V extends any> {
  data: V | undefined;
  stale: boolean;
}

interface InternalChannels {
  [key: `instance:${string}:event:${string}`]:
    | { error: any }
    | { response: any }
    | { stream: true; start: true }
    | { stream: true; data: any }
    | { stream: true; end: true }
    | { stream: true; error: Error };
}

export class Instance<InstanceData = {}, InstanceChannels = {}> {
  running: boolean = false;
  keepAlive = new PromiseList();
  aborted = new ControlledPromise("Aborted");

  config: ScheduleInstanceData;
  private adapters: Adapters;

  get kind() {
    return this.config.kind;
  }

  get id() {
    return this.config.id;
  }

  constructor(config: ScheduleInstanceData, adapters: Adapters) {
    this.config = config;
    this.adapters = adapters;
  }

  /* This is where you initiate the instance */
  async start(): Promise<any> {}

  /* Dispose of all the ressources allocated */
  async stop(): Promise<any> {}

  async callMethodDefinedInEvent(
    eventId: EventId,
    event: InstanceMethodCall,
  ): Promise<any> {
    const { action, args, mode = "normal" } = event;

    // @ts-ignore
    const method = this[action]?.bind(this);
    const isActionDefined = typeof method == "function";
    if (!isActionDefined) {
      // TODO: Maybe emit an Error that can be forawarded to the client ???
      return;
    }

    // Wrap the method in a Promise. to ensure that if the method is sync
    // We still catch the error if one happens.
    const channelID = Client.getChannelForEventResponse(this.id, eventId);
    const [error, response] = await Promise.resolve()
      .then(() => method?.(...args))
      .then((res) => [null, res])
      .catch((err) => [err, null]);

    if (mode === "emit") {
      if (response instanceof Stream) {
        const promise = this.keepAlive.addControlled();
        response.on("end", () => promise.resolve(true));
        response.start();
      }
      return;
    }

    if (mode === "scheduled") {
      this.emitInternal(channelID, { error, response });
    }

    if (mode === "normal") {
      if (response instanceof Stream) {
        const promise = this.keepAlive.addControlled();
        response.on("start", () =>
          this.emitInternal(channelID, { stream: true, start: true }),
        );
        response.on("data", (data) =>
          this.emitInternal(channelID, { stream: true, data: data }),
        );

        response.on("error", (err) =>
          this.emitInternal(channelID, { stream: true, error: err }),
        );

        response.on("end", () => {
          this.emitInternal(channelID, { stream: true, end: true });
          promise.resolve(true);
        });
        response.start();
      } else {
        if (error) {
          const serializedError = Client.serializeError(error);
          this.emitInternal(channelID, { error: serializedError });
        } else {
          this.emitInternal(channelID, { response });
        }
      }
    }
  }

  data: InstanceData | null = null;

  saveAsyncManager = new AsyncDebounceHandler();
  async save(data: InstanceData) {
    this.data = data;

    await this.runExternalEffect(async () => {
      await this.saveAsyncManager.onlyLastOnePerTick(async () => {
        await this.adapters.snapshot.save(this.id, data);
      });
    });
  }

  private async loadData() {
    // Seed data with previously stored data.
    const currentData = await this.adapters.snapshot.load<InstanceData | null>(
      this.id,
    );

    this.data = currentData;
  }

  async run(
    abortSignal: AbortSignal,
  ): Promise<InstanceResult<InstanceData | null>> {
    await this.loadData();

    // Start the process + start listening for events
    this.running = true;
    const current = this.start();
    this.keepAlive.add(current);
    this.subscribeToInstanceEvent();

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
  }

  async stopRun() {
    if (!this.running) return;
    this.running = false;
    this.onEventSubscription?.unsubscribe();
    await this.stop();
    await this.save(this.data!);
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
  private subscribeToInstanceEvent() {
    const NO_EVENT_TIMEOUT = 3000;
    const timer = new ControlledTimeout();
    timer.start(NO_EVENT_TIMEOUT);

    this.onEventSubscription =
      this.adapters.messages.subscribe<InstanceMethodCall>(
        this.id,
        async (event) => {
          this.keepAlive.addWait(300, "Event Received");
          timer.restart(NO_EVENT_TIMEOUT);

          const waitUntilFullyProcessed = Promise.all([
            this.callMethodDefinedInEvent(event.id, event.data),
            this.adapters.messages.ack(this.id, event.id),
          ]);

          this.keepAlive.add(waitUntilFullyProcessed);
          await waitUntilFullyProcessed;
        },
      );

    this.keepAlive.add(timer.await);
  }

  /** this function is used to emit message to one client,
   * also for type safety, so that so that it doesn't show on client.on channel name autocomplete
   **/
  async emitInternal<Channel extends Extract<keyof InternalChannels, string>>(
    channel: Channel,
    data: InternalChannels[Channel],
  ) {
    return this.runExternalEffect(async () => {
      return await this.adapters.pubsub.emit(channel, data);
    });
  }

  /** this will send a message to all client subscribed to this instance specified channel */
  emit<Channel extends Extract<keyof InstanceChannels, string>>(
    channel: Channel,
    data: InstanceChannels[Channel],
  ) {
    return this.runExternalEffect(async () => {
      return await this.adapters.pubsub.emit(channel, data);
    });
  }

  private syncAbortSignalWithPromise(abortCtl: AbortSignal) {
    const onAbortCallback = () => {
      if (!this.live) {
        return;
      }

      this.aborted.resolve(true);
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
