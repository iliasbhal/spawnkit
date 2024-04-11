import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { Stream } from "@/utils/Stream";
import { Instance } from "./Instance";
import {
  Adapters,
  ScheduleInstanceData,
  InstanceMethodCall,
  EventId,
} from "../adapters";
import { Client } from "./Client";
import { Data } from "./Data";

export type InstanceSignalEvent = "abort" | "start" | "dispose";

export interface InstanceProps {
  kind: string;
  id: string;
}

export interface InstanceDataChannels {
  [key: `kind:${string}:id:${string}:data`]: { data: any };
}

export type InstanceEventRequestMessage = { error: any } | { response: any };

export type InstanceEventStreamMessage =
  | { stream: true; start: true }
  | { stream: true; data: any }
  | { stream: true; end: true }
  | { stream: true; error: Error };

export interface InstanceEventChannels {
  [key: `kind:${string}:id:${string}:event:${string}`]:
    | InstanceEventRequestMessage
    | InstanceEventStreamMessage;
}

type Emit<Channels extends Record<string, any>> = <
  Channel extends keyof Channels,
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
  emit: Emit<InstanceChannels>;
  waitFor: (promise: Promise<any>) => any;
}

export class InstanceProxy<Inst extends Instance> {
  public instance: Inst;
  public running: boolean = false;
  public keepAlive = new PromiseList();
  public aborted = new ControlledPromise("Aborted");

  public config: ScheduleInstanceData;
  public adapters: Adapters;
  public abortSignal: AbortSignal;

  constructor(
    instance: Inst,
    config: ScheduleInstanceData,
    adapters: Adapters,
    abortSignal: AbortSignal,
  ) {
    this.config = config;
    this.adapters = adapters;
    this.instance = instance;
    this.abortSignal = abortSignal;

    const instanceData = new Data<Inst["__types"]["InstanceData"]>({
      adapters,
      instanceId: config.id,
    });

    InstanceProxy.configureInstance(instance, config, {
      emit: (channel, data) => {
        return this.emitInstanceEvent(channel, data);
      },
      waitFor: (promise: Promise<any>) => {
        return this.keepAlive.add(promise);
      },
      data: {
        get: (...args: Parameters<(typeof instanceData)["get"]>) =>
          instanceData.get(...args),
        set: (...args: Parameters<(typeof instanceData)["set"]>) => {
          return this.runExternalEffect(async () => {
            return await instanceData.set(...args);
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
    requestId: EventId,
    event: InstanceMethodCall,
  ): Promise<any> {
    const { action, args, mode = "normal" } = event;

    // @ts-ignore
    const method = this.instance[action]?.bind(this.instance);
    const isActionDefined = typeof method == "function";
    if (!isActionDefined) {
      // TODO: Maybe emit an Error that can be forawarded to the client ???
      return;
    }

    // Wrap the method in a Promise. to ensure that if the method is sync
    // We still catch the error if one happens.
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
      this.emitRequestResponse(requestId, { error, response });
    }

    if (mode === "normal") {
      if (response instanceof Stream) {
        const promise = this.keepAlive.addControlled();
        response.on("start", () =>
          this.emitRequestResponse(requestId, { stream: true, start: true }),
        );
        response.on("data", (data) =>
          this.emitRequestResponse(requestId, { stream: true, data: data }),
        );

        response.on("error", (err) => {
          const serializedError = Client.serializeError(err);
          // console.log("serializedError", serializedError);
          this.emitRequestResponse(requestId, {
            stream: true,
            error: serializedError,
          });
        });

        response.on("end", () => {
          this.emitRequestResponse(requestId, { stream: true, end: true });
          promise.resolve(true);
        });
        response.start();
      } else {
        if (error) {
          const serializedError = Client.serializeError(error);
          this.emitRequestResponse(requestId, { error: serializedError });
        } else {
          this.emitRequestResponse(requestId, { response });
        }
      }
    }
  }

  public async run() {
    // await this.loadData();

    // Start the process + start listening for events
    this.instance.on?.("start");
    this.running = true;
    this.subscribeToInstanceEvent();

    const syncAbort = this.syncAbortSignal(this.abortSignal);
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
    this.instance.on?.("dispose");

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
        this.instance.id,
        async (event) => {
          this.keepAlive.addWait(300, "Event Received");
          timer.restart(NO_EVENT_TIMEOUT);

          const processed = Promise.resolve()
            .then(() => this.callMethodDefinedInEvent(event.id, event.data))
            .then(() => this.adapters.messages.ack(this.instance.id, event));

          this.keepAlive.add(processed);
        },
      );

    this.keepAlive.add(timer.await);
  }

  /** this function is used to emit message to one client,
   * also for type safety, so that so that it doesn't show on client.on channel name autocomplete
   **/
  public async emitRequestResponse(requestId: string, data: any) {
    const channelID = Client.getChannelForEventResponse(
      this.instance.kind,
      this.instance.id,
      requestId,
    );

    return this.runExternalEffect(async () => {
      return await this.adapters.messages.publish(channelID, data);
    });
  }

  public async emitInstanceEvent(channel: string, data: any) {
    const instanceChannel = Client.getChannelForInstance(
      this.config.kind,
      this.config.id,
      channel.toString(),
    );

    return this.runExternalEffect(async () => {
      return await this.adapters.messages.publish(instanceChannel, data);
    });
  }

  public syncAbortSignal(abortSignal: AbortSignal) {
    const onAbortCallback = () => {
      if (!this.live) {
        return;
      }

      this.instance.on?.("abort");
      this.aborted.resolve(true);
    };

    abortSignal.addEventListener("abort", onAbortCallback);
    this.aborted.await.finally(() => {
      abortSignal.removeEventListener("abort", onAbortCallback);
    });

    return {
      dispose: () => {
        abortSignal.removeEventListener("abort", onAbortCallback);
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
