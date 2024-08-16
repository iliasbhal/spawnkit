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
import { RemoteError } from "./RemoteError";
import { ControlledInterval } from "@/utils/ControlledInterval";

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
  id: string;
  kind: string;
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

export const HEALTH_CHECK_INTERVAL = 5000;
export const HEALTH_CHECK_NOTIFY_PER_INTERVAL = 3;

interface MessageContext {
  event: InstanceMethodCall,
  messageId: EventId;
  metadata: ScheduledCallMetaData;
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

  constructor(config: {
    logger: Logger,
    instance: Inst,
    config: InstanceIdentifier,
    adapters: Adapters,
    abortSignal: AbortSignal,
  }) {
    this.logger = config.logger;
    this.config = config.config;
    this.adapters = config.adapters;
    this.instance = config.instance;
    this.abortSignal = config.abortSignal;

    const data = new Data<any>({
      adapters: this.adapters,
      instance: this.config,
      logger: this.logger,
    });

    InstanceProxy.configureInstance(this.instance, {
      id: config.config.id,
      kind: config.config.kind,
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
    api: InterfaceAPI<
      Instance["__types"]["InstanceData"],
      Instance["__types"]["InstanceChannels"]
    >,
  ) {
    instance.api = api;
  }

  public async callMethodDefinedInEvent(
    messageId: EventId,
    event: InstanceMethodCall,
  ): Promise<any> {
    const { action, args } = event;

    const logger = this.createCallLoggerFor(messageId);
    const handleMethodResponse = this.createResultHandler(messageId, event);

    // Wrap the method in a Promise. to ensure that if the method is sync
    // We still catch the error if one happens.
    logger.start(event);
    const [error, response] = await Promise.resolve()
      .then(() => {
        // @ts-ignore
        const method = this.instance[action]?.bind(this.instance);
        const methodExists = typeof method == "function";
        if (!methodExists) throw new Error("Bad Request: Method not found");
        return method?.(...args)
      })
      .then((res) => [null, res])
      .catch((err) => [err, null]);

    await handleMethodResponse({
      error,
      response,
    });
  }

  createCallLoggerFor(messageId: EventId) {
    return {
      start: (event: InstanceMethodCall) => {
        this.trace({
          type: "proxy:call:start",
          id: messageId,
          event,
        });
      },
      result: (result: any) => {
        this.trace({
          type: "proxy:call:result",
          id: messageId,
          result,
        });
      }
    }
  }

  createResultHandler(
    messageId: EventId,
    event: InstanceMethodCall,
  ) {
    const startedAt = Date.now();
    const reponseContext: MessageContext = {
      messageId,
      event,
      metadata: {
        start_at: startedAt,
        ended_at: null as any,
        response: {
          stream: null,
          data: null,
          error: null,
        }
      },
    };

    return async (result: { error: Error, response: any }) => {
      const isStream = result.response instanceof Stream;
      const response = isStream
        ? await this.handleStreamResult(result.response, reponseContext)
        : await this.handleBasicResult(result, reponseContext);

      return response;
    };
  }

  async handleBasicResult(
    result: { error: Error; response: any },
    context: MessageContext,
  ) {
    const promise = this.keepAlive.addControlled();
    context.metadata.ended_at = Date.now();

    if (result.error) {
      const serializedError = RemoteError.serialize(result.error);
      context.metadata.response.error = serializedError;
      await this.respond(context, {
        error: serializedError,
      });

    } else {
      context.metadata.response.data = result.response;
      await this.respond(context, {
        response: result.response,
      });
    }

    await this.storeMetadataForScheduledCall(context);
    promise.resolve(result);
    return promise.await;
  }

  handleStreamResult(
    stream: Stream<any>,
    context: MessageContext,
  ) {
    const promise = this.keepAlive.addControlled();
    context.metadata.response.stream = [];
    let steamIdx = 0;

    stream.on("start", () => {
      this.respond(context, {
        stream: true,
        index: steamIdx++,
        start: true,
      });
    });

    stream.on("data", (data) => {
      context.metadata.response.stream!.push(data);
      this.respond(context, {
        stream: true,
        index: steamIdx++,
        data: data,
      });
    });

    const handleError = async (error: Error) => {
      const serializedError = RemoteError.serialize(error);
      context.metadata.response.error = serializedError;
      await this.respond(context, {
        stream: true,
        index: steamIdx++,
        error: serializedError as Error,
      });

      promise.resolve(error);
    };

    stream.on("error", (err) => handleError(err));
    const syncAbort = this.addAbortListener(() => {
      handleError(new Error("Worker Aborted"));
    });

    stream.on("end", async () => {
      syncAbort.dispose();

      context.metadata.ended_at = Date.now();
      await this.respond(context, {
        stream: true,
        index: steamIdx++,
        end: true,
      });

      // once the stream has ended, we shall store the result of the compute;
      await this.storeMetadataForScheduledCall(context);
      promise.resolve(true);
    });

    stream.start();
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
    this.continouslyEmitHealthCheckSignal();

    const syncAbort = this.addAbortListener(() => {
      if (!this.live) return;

      this.keepAlive.clear();
      this.dispose();
      this.aborted.resolve(true);
    });

    await this.keepAliveUntilNothingHappens()
      .finally(() => syncAbort.dispose());
  }

  public async dispose() {
    if (!this.running) return;
    this.running = false;
    this.onEventSubscription?.unsubscribe();
    this.healthCheckInterval?.dispose();
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

  public healthCheckInterval: ControlledInterval | undefined;
  public continouslyEmitHealthCheckSignal() {
    this.healthCheckInterval = ControlledInterval.new({
      interval: HEALTH_CHECK_INTERVAL / HEALTH_CHECK_NOTIFY_PER_INTERVAL,
      execute: (count) => {
        const channelId = Client.getChannelForEventBus("__INTERNAL__", 'health');
        return this.runExternalEffect(async () => {
          return await this.adapters.messages.publish(
            this.instance,
            channelId,
            {
              health: true,
              count,
            },
          );
        });
      },
    });
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
  public async respond(context: MessageContext, data: any) {
    const logger = this.createCallLoggerFor(context.messageId);
    logger.result(data);

    // only when mode is normal, we should respond
    // when mode is 'scheduled' or 'skip' we should not respond
    // since there is no client waiting for the response
    const shouldRespond = context.event.mode === 'normal';
    if (!shouldRespond) {
      return;
    }

    const channelID = Client.getChannelForEventResponse(context.messageId);
    return this.runExternalEffect(async () => {
      // console.log("EMIT REQUEST RESPONSE", data);
      return await this.adapters.messages.publish(
        this.instance,
        channelID,
        data,
      );
    });
  }

  public async storeMetadataForScheduledCall(context: MessageContext) {
    const scheduleId = context.event.context?.scheduleId;
    if (!scheduleId) {
      return;
    }

    await this.adapters.events.store(
      this.instance.kind,
      this.instance.id,
      scheduleId,
      context.metadata,
    );
  }

  // const subscription = this.adapters.messages.subscribe<InternalMessageData>(
  //   instanceIdentifier,
  //   Client.getChannelForEventBus("__INTERNAL__", 'health'),
  //   (message) => {
  //     healthTimeout.reset();
  //   },
  // );

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

  private addAbortListener(callback: () => any) {
    this.abortSignal.addEventListener("abort", callback);

    const disposeListener = () => {
      this.abortSignal.removeEventListener("abort", callback);
    };

    this.aborted.await.finally(() => disposeListener());

    return {
      dispose: disposeListener
    };
  }

  public async keepAliveUntilNothingHappens() {
    await this.keepAlive.waitOnAll();
    await this.dispose();

    // When we call .dispose() there is maybe a new effect
    // that is initiated to save or do some cleanup.
    // we should wait for newly created operation to complete
    // before yielding the promise. It the equivalent of a gracefull shutdown
    await this.keepAlive.waitOnAll();
  }
}
