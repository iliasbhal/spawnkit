import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { Stream } from "@/models/Stream";
import { Instance } from "./Instance";
import {
  Adapters,
  InstanceIdentifier,
  InstanceMethodCall,
  EventId,
  ScheduleId,
  ScheduledCallMetaData,
} from "../adapters";
import { Client } from "./Client";
import { Data } from "./Data";
import { Logger } from "./Logger";

export interface InstanceProps {
  kind: string;
  id: string;
}

export interface InstanceDataChannels {
  [key: `kind:${string}:id:${string}:data`]: { data: any };
}

export type InstanceEventRequestMessage = { error: any } | { response: any };

export type InstanceEventStreamMessage =
  | { stream: true; index: number; start: true }
  | { stream: true; index: number; data: any }
  | { stream: true; index: number; end: true }
  | { stream: true; index: number; error: Error };

export interface InstanceEventChannels {
  [key: `kind:${string}:id:${string}:event:${string}`]:
  | InstanceEventRequestMessage
  | InstanceEventStreamMessage;
}

type Emit<Channels extends Record<string, any>> = <
  Channel extends Extract<keyof Channels, string>,
>(
  channel: Channel,
  data: Channels[Channel],
) => Promise<void>;

export interface InterfaceAPI<
  InstanceData extends Record<string, any>,
  InstanceChannels extends Record<string, any> = Record<string, any>,
> {
  data: {
    get: Data<InstanceData>["get"];
    set: Data<InstanceData>["set"];
  };
  logger: {
    log: (message: string) => void;
  };
  emit: Emit<InstanceChannels>;
  waitFor: (promise: Promise<any>) => any;
}

export class InstanceProxy<Inst extends Instance> {
  public logger: Logger;
  public instance: Inst;
  public running: boolean = false;
  public keepAlive = new PromiseList();
  public aborted = new ControlledPromise("Aborted");

  public config: InstanceIdentifier;
  public adapters: Adapters;
  public abortSignal: AbortSignal;

  constructor(
    logger: Logger,
    instance: Inst,
    config: InstanceIdentifier,
    adapters: Adapters,
    abortSignal: AbortSignal,
    data: Data<Inst["__types"]["InstanceData"]>,
  ) {
    this.logger = logger;
    this.config = config;
    this.adapters = adapters;
    this.instance = instance;
    this.abortSignal = abortSignal;

    InstanceProxy.configureInstance(instance, config, {
      emit: (channel, data) => {
        return this.emit(channel, data);
      },
      waitFor: (promise: Promise<any>) => {
        return this.keepAlive.add(promise);
      },
      logger: {
        log: (message: string) => {
          return this.logger.log({
            type: "log",
            message,
          });
        },
      },
      data: {
        get: (...args: Parameters<(typeof data)["get"]>) => data.get(...args),
        set: (...args: Parameters<(typeof data)["set"]>) => {
          return this.runExternalEffect(async () => {
            return await data.set(...args);
          });
        },
      },
    });
  }

  static configureInstance(
    instance: Instance,
    config: InstanceProps,
    api: InterfaceAPI<
      Instance["__types"]["InstanceData"],
      Instance["__types"]["InstanceChannels"]
    >,
  ) {
    instance.id = config.id;
    instance.kind = config.kind;
    instance.api = api;
  }

  public async callMethodDefinedInEvent(
    messageId: EventId,
    event: InstanceMethodCall,
  ): Promise<any> {
    const { action, args, mode = "normal", context } = event;

    // @ts-ignore
    const method = this.instance[action]?.bind(this.instance);
    const isActionDefined = typeof method == "function";
    if (!isActionDefined) {
      // TODO: Maybe emit an Error that can be forawarded to the client ???
      return;
    }

    // Wrap the method in a Promise. to ensure that if the method is sync
    // We still catch the error if one happens.
    const startedAt = Date.now();
    const callID = crypto.randomUUID();
    this.trace({
      type: "proxy:call:start",
      id: callID,
      method: action,
      args,
    });

    const [error, response] = await Promise.resolve()
      .then(() => method?.(...args))
      .then((res) => [null, res])
      .catch((err) => [err, null]);

    const callMetaData = {
      start_at: startedAt,
      ended_at: null as any,
      stream: false,
      result: null,
      error: null,
    };

    const shouldStoreResult = !!context?.scheduleId;
    const chouldEmitResponseBack = mode === "normal";
    const reponseContext = {
      messageId: chouldEmitResponseBack ? messageId : undefined,
      scheduleId: shouldStoreResult ? context?.scheduleId : undefined,
      callMetaData,
    };

    const isStream = response instanceof Stream;
    const result = await Promise.resolve().then(() =>
      isStream
        ? this.handleStreamResult(response, reponseContext)
        : this.handleBasicResult({ error, response }, reponseContext),
    );

    this.trace({
      type: "proxy:call:end",
      id: callID,
      result,
    });
  }

  handleBasicResult(
    result: { error: Error; response: any },
    config: {
      messageId?: EventId;
      scheduleId?: ScheduleId;
      callMetaData: ScheduledCallMetaData;
    },
  ) {
    const promise = this.keepAlive.addControlled();
    config.callMetaData.ended_at = Date.now();

    if (result.error) {
      const serializedError = Client.serializeError(result.error);
      config.callMetaData.error = serializedError;

      if (config.messageId) {
        this.adapters.events.store(
          this.instance.kind,
          this.instance.id,
          config.messageId,
          config.callMetaData,
        );
      }

      if (config.messageId) {
        this.respond(config.messageId, {
          error: serializedError,
        });
      }

      promise.resolve(result);
    } else {
      config.callMetaData.result = result.response;

      if (config.messageId) {
        this.respond(config.messageId, {
          response: result.response,
        });
      }

      if (config.scheduleId) {
        this.adapters.events.store(
          this.instance.kind,
          this.instance.id,
          config.scheduleId,
          config.callMetaData,
        );
      }

      promise.resolve(result);
    }

    return promise.await;
  }

  handleStreamResult(
    result: Stream<any>,
    config: {
      requestId?: EventId;
      scheduleId?: ScheduleId;
      callMetaData: ScheduledCallMetaData;
    },
  ) {
    const promise = this.keepAlive.addControlled();
    config.callMetaData.stream = true;
    config.callMetaData.result = [];
    let steamIdx = 0;

    result.on("start", () => {
      if (config.requestId)
        this.respond(config.requestId, {
          stream: true,
          index: steamIdx++,
          start: true,
        });
    });

    result.on("data", (data) => {
      config.callMetaData.result.push(data);
      if (config.requestId)
        this.respond(config.requestId, {
          stream: true,
          index: steamIdx++,
          data: data,
        });
    });

    const handleError = (error: Error) => {
      const serializedError = Client.serializeError(error);
      config.callMetaData.error = serializedError;

      if (config.requestId)
        this.respond(config.requestId, {
          stream: true,
          index: steamIdx++,
          error: serializedError as Error,
        });

      promise.resolve(error);
    };

    result.on("error", (err) => {
      handleError(err);
    });

    const syncAbort = this.createAbortHandler(this.abortSignal, () => {
      handleError(new Error("Worker Aborted"));
    });

    result.on("end", () => {
      syncAbort.dispose();

      config.callMetaData.ended_at = Date.now();

      // once the stream has ended, we shall store the result of the compute;
      if (config.scheduleId) {
        this.adapters.events.store(
          this.instance.kind,
          this.instance.id,
          config.scheduleId,
          config.callMetaData,
        );
      }

      if (config.requestId) {
        this.respond(config.requestId, {
          stream: true,
          index: steamIdx++,
          end: true,
        });
      }

      promise.resolve(true);
    });

    result.start();
    return promise.await;
  }

  trace(...args: Parameters<typeof this.logger.log>) {
    Promise.allSettled([
      Promise.resolve().then(() => this.instance.signal?.(...args)),
      Promise.resolve().then(() => this.logger.log(...args)),
    ]);
  }

  /** Starts listening to events */
  public async start() {
    this.running = true;
    this.trace({ type: "proxy:start" });

    this.subscribeToInstanceEvent();

    const syncAbort = this.createAbortHandler(this.abortSignal, () => {
      if (!this.live) return;
      this.aborted.resolve(true);
    });

    this.aborted.await.finally(() => {
      this.keepAlive.clear();
      syncAbort.dispose();
      this.dispose();
    });

    await this.keepAliveUntilNothingHappens().finally(() => {
      syncAbort.dispose();
    });
  }

  public async dispose() {
    if (!this.running) return;
    this.running = false;
    this.onEventSubscription?.unsubscribe();
    this.trace({ type: "proxy:dispose" });

    // When the instance receives the 'dispose' event
    // it should immedately schedule a dispose function
    // using this.waitFor function.
    this.keepAlive.addWait(0, "wait for dispose scheduling");
  }

  public get live() {
    if (!this.running) return false;
    if (this.keepAlive.fulfilled) return false;
    if (this.aborted.fulfilled) return false;
    return true;
  }

  protected async runExternalEffect<T>(
    callback: () => Promise<T>,
    debugId?: string,
  ): Promise<void> {
    if (this.aborted.fulfilled) {
      // silence attempt
      return;
    }

    const pending = this.keepAlive.addControlled(debugId);

    Promise.resolve()
      .then(callback)
      .then(() => pending.resolve(true))
      .catch((err) => pending.reject(err));

    await pending.await;
  }

  public onEventSubscription: { unsubscribe: Function } | undefined;
  public subscribeToInstanceEvent() {
    const NO_EVENT_TIMEOUT = 3000;
    const timer = new ControlledTimeout();
    timer.start(NO_EVENT_TIMEOUT);

    this.onEventSubscription =
      this.adapters.messages.subscribe<InstanceMethodCall>(
        this.instance,
        "rpc",
        async (event) => {
          this.keepAlive.addWait(300, "Event Received");
          timer.restart(NO_EVENT_TIMEOUT);

          const processed = Promise.resolve()
            .then(() => this.callMethodDefinedInEvent(event.id, event.data))
            .finally(() =>
              this.adapters.messages.ack(this.instance, "rpc", event.id),
            );

          this.keepAlive.add(processed);
        },
      );

    this.keepAlive.add(timer.await);
  }

  /** this function is used to emit message to one client,
   * also for type safety, so that so that it doesn't show on client.on channel name autocomplete
   **/
  public async respond(messageId: string, data: any) {
    const channelID = Client.getChannelForEventResponse(messageId);
    return this.runExternalEffect(async () => {
      // console.log("EMIT REQUEST RESPONSE", data);
      return await this.adapters.messages.publish(
        this.instance,
        channelID,
        data,
      );
    });
  }

  public async emit(channel: string, data: any) {
    const channelID = Client.getChannelForEventBus("instance", channel.toString());
    return this.runExternalEffect(async () => {
      return await this.adapters.messages.publish(
        this.instance,
        channelID,
        data,
      );
    });
  }

  public createAbortHandler(abortSignal: AbortSignal, callback: () => any) {
    abortSignal.addEventListener("abort", callback);
    this.aborted.await.finally(() => {
      abortSignal.removeEventListener("abort", callback);
    });

    return {
      dispose: () => {
        abortSignal.removeEventListener("abort", callback);
      },
    };
  }

  public async keepAliveUntilNothingHappens() {
    await this.keepAlive.waitOnAll();
    await this.dispose();

    // When we call .stop() there is a new snapshot that is generated
    // we should wait for newly created operation to complete
    // before yielding the promise. It the equivalent of a gracefull shutdown
    await this.keepAlive.waitOnAll();
  }
}
