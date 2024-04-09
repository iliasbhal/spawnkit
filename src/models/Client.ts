import type {
  Instance,
  InternalChannels,
  Instance as SpawnkitInstance,
} from "./Instance";
import { Stream } from "@/utils/Stream";
import {
  Adapters,
  ScheduleEventData,
  ScheduleId,
  Cron,
  Delay,
  InstanceId,
  EventId,
  InstanceKind,
  InstanceMethodCall,
} from "../adapters";
import { Data } from "./Data";

export interface SpawnkitConfig {
  adapters: Adapters;
  instances: { [key: string]: typeof Instance<any> };
}

export class RemoteError extends Error {}

export class Client<CP extends SpawnkitConfig> {
  private adapters: SpawnkitConfig["adapters"];
  private instances: SpawnkitConfig["instances"];

  constructor(opts: SpawnkitConfig) {
    this.adapters = opts.adapters;
    this.instances = opts.instances;
  }

  static from<CP extends SpawnkitConfig>(opts: CP) {
    return new Client<CP>(opts);
  }

  static getChannelForEventResponse(
    kind: InstanceKind,
    id: InstanceId,
    eventId: EventId,
  ) {
    return Client.getChannel(kind, id, `event:${eventId}`);
  }

  static getChannel<Channel extends string>(
    kind: InstanceKind,
    id: InstanceId,
    channel: Channel,
  ) {
    return `kind:${kind}:id:${id}:${channel}` as const;
  }

  static deserializeError(serializedError: { message: string; name: string }) {
    const error = new RemoteError();
    Object.assign(error, serializedError);
    return error;
  }

  static serializeError(error: Error) {
    if (!error) {
      return null;
    }

    return Object.assign(
      {},
      error,
      {
        message: error.message,
        name: error.constructor.name,
        stack: error.stack,
      },
      {
        originalLine: undefined,
        originalColumn: undefined,
      },
    );
  }

  timesampByInstnace = new Map<InstanceId, number>();
  private shouldScheduleInstance(instanceId: InstanceId) {
    const lastSentEventTimesamp = this.timesampByInstnace.get(instanceId);
    if (!lastSentEventTimesamp) {
      this.timesampByInstnace.set(instanceId, Date.now());
      return true;
    }

    const now = Date.now();
    const timeSinceLastEventSent = now - lastSentEventTimesamp;
    const shouldScheduleInstance = timeSinceLastEventSent > 1000;
    this.timesampByInstnace.set(instanceId, now);
    return shouldScheduleInstance;
  }

  spawn<Kind extends keyof CP["instances"]>(
    kind: Kind,
    instanceId: InstanceId,
  ) {
    type Instance = InstanceType<CP["instances"][Kind]>;
    type InstanceEvent = Parameters<Instance["callMethodDefinedInEvent"]>[1];
    type InstanceEmittable = Parameters<Instance["emit"]>;
    type InstanceInternalEmittable = Parameters<Instance["emitInternal"]>;

    type ExtractMethodNames<T> = {
      [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
    }[keyof T];

    type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;
    type InheritedMethods = ExtractMethodNames<SpawnkitInstance>;
    type AvailableMethods = Omit<ExtractMethods<Instance>, InheritedMethods>;

    type MakeRemote<T> = {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? // If the function is sychronouse, we want to cast the return to a Promise
          // And it it's already a promise, it's gonna stay a promise.
          (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
        : never;
    };

    type MakeEmitable<T> = {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? (...args: Parameters<T[K]>) => Promise<boolean>
        : never;
    };

    type MakeSchedulable<T> = {
      [K in keyof T]: T[K] extends (...args: any[]) => any
        ? (...args: Parameters<T[K]>) => Promise<ScheduleId>
        : never;
    };

    type RemoteMethodes = MakeRemote<AvailableMethods>;
    type EmitRemoteMethods = MakeEmitable<AvailableMethods>;
    type ScheduleRemoteMethods = MakeSchedulable<AvailableMethods>;

    type InternalMessageChannel = InstanceInternalEmittable[0];
    type InternalMessageData = InstanceInternalEmittable[1];
    type PublicMessageChannel = InstanceEmittable[0];
    type PublicMessageData = InstanceEmittable[1];

    // return {} as {
    //   InternalMessageChannel: InternalMessageChannel;
    //   InternalMessageData: InternalMessageData;
    //   PublicMessageChannel: PublicMessageChannel;
    //   PublicMessageData: PublicMessageData;
    // };

    const sendEventToInstance = async (event: InstanceEvent) => {
      const shouldScheduleInstance = this.shouldScheduleInstance(instanceId);
      const [eventId] = await Promise.all([
        this.adapters.messages.publish(instanceId, event),

        // when sending an event, we shall always try to spawn an instance
        // to ensure that the event will be processed except In the case that we are sending a lot of events
        // We don't have to try t schedule an instance together with every event we send.
        // Once an instance terminate, it will try again 3 times to check if there are pending events process.
        // We can rely on this fact to only schedule an instance if it has been a long time since last event push.
        // This is mainly to avoid adding unnessary pressure the the backend.
        // Scheduling too often is guarenteed to fail often as theu won't be able to acquire the locks
        shouldScheduleInstance &&
          this.adapters.scheduler.instance({
            id: instanceId,
            kind: kind.toString(),
          }),
      ]);

      return eventId;
    };

    const scheduleEvent = async (schedule: ScheduleEventData) => {
      return await this.adapters.scheduler.event(schedule);
    };

    const data = new Data({
      adapters: this.adapters,
      instanceId,
    }) as Instance["data"];

    const instanceClientAPI = {
      id: instanceId,
      kind: kind,

      on: (
        channel: PublicMessageChannel,
        callback: (data: PublicMessageData) => any,
      ) => {
        const channelID = Client.getChannel(
          kind as string,
          instanceId,
          channel,
        );
        return this.adapters.messages.subscribe<PublicMessageData>(
          channelID,
          (message) => {
            callback(message.data);
          },
        );
      },

      data: data,

      scheduled: {
        list: async () => {
          return this.adapters.scheduler.list();
        },
        cancel: async (scheduleId: ScheduleId) => {
          return this.adapters.scheduler.cancel(scheduleId);
        },
      },
    };

    const createScheduledMethodHandler = (mode: "cron" | "delay") => {
      return (scheduleArgs: any) => {
        const scheduleConfig = {
          [mode]: scheduleArgs,
        } as Delay | Cron;

        return new Proxy(
          {},
          {
            get(target, prop, receiver) {
              if (prop in target) return Reflect.get(target, prop, receiver);
              if (typeof prop !== "string") return;

              return async (...args: any[]) => {
                const scheduleId = await scheduleEvent({
                  schedule: scheduleConfig,
                  instance: {
                    id: instanceId,
                    kind: kind.toString(),
                  },
                  event: {
                    action: prop,
                    args,
                    mode: "scheduled",
                  },
                });

                return scheduleId;
              };
            },
          },
        );
      };
    };

    const createRemoteMethodHandler = (mode: InstanceMethodCall["mode"]) => {
      return (action: string) => {
        return async (...args: any[]) => {
          const eventId = await sendEventToInstance({
            action,
            args,
            mode,
          });

          if (mode === "emit") {
            // DO NOTHING -> simply return the eventId na don't wait for an answer
            return eventId;
          }

          if (mode === "normal") {
            return new Promise((resolve, reject) => {
              const channelID = Client.getChannelForEventResponse(
                kind as string,
                instanceId,
                eventId,
              );

              const internalStream = new ClientStream();
              const handleStreamMessage = (
                subscription: { unsubscribe: Function },
                message: InternalMessageData,
              ) => {
                if ("start" in message) resolve(internalStream);
                internalStream.forward(message);
                if ("end" in message) subscription.unsubscribe();
              };

              const handleDefaultMessage = (
                subscription: { unsubscribe: Function },
                message: InternalMessageData,
              ) => {
                if ("error" in message) {
                  const error = Client.deserializeError(message.error);
                  reject(error);
                  subscription.unsubscribe();
                }

                if ("response" in message) {
                  resolve(message.response);
                  subscription.unsubscribe();
                }
              };

              const subscription: ReturnType<
                typeof this.adapters.messages.subscribe<InternalMessageData>
              > = this.adapters.messages.subscribe<InternalMessageData>(
                channelID,
                (message) => {
                  if ("stream" in message.data)
                    return handleStreamMessage(subscription, message.data);
                  if ("response" in message.data)
                    return handleDefaultMessage(subscription, message.data);
                  if ("error" in message.data)
                    return handleDefaultMessage(subscription, message.data);
                },
              );
            });
          }

          throw new Error("Not Implemented");
        };
      };
    };

    const emitRemoteMethodHandler = createRemoteMethodHandler("emit");
    const instanceEmitClientAPI = new Proxy(
      {},
      {
        get(target, prop, receiver) {
          if (prop in target) return Reflect.get(target, prop, receiver);
          if (typeof prop !== "string") return;
          return emitRemoteMethodHandler(prop);
        },
      },
    );

    const cronRemoteMethodHandler = createScheduledMethodHandler("cron");
    const delayRemoteMethodHandler = createScheduledMethodHandler("delay");

    // We use the Kind type here just o it to show nicely
    // in the intelissense. it will show as Remote<OrderBook> for example
    type Spawn<Kind> = RemoteMethodes &
      typeof instanceClientAPI & { emit: EmitRemoteMethods } & {
        delay(delayMS: number): ScheduleRemoteMethods;
        cron(crontab: string): ScheduleRemoteMethods;
      };

    const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
    return new Proxy(instanceClientAPI as Spawn<Instance>, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        if (typeof prop !== "string") return;

        if (prop === "emit") {
          return instanceEmitClientAPI;
        }

        if (prop == "delay") {
          return delayRemoteMethodHandler;
        }

        if (prop == "cron") {
          return cronRemoteMethodHandler;
        }

        return normalRemoteMethodHandler(prop);
      },
    });
  }
}

class ClientStream extends Stream<any> {
  constructor() {
    super(() => {});
  }

  forward(message: InternalChannels[keyof InternalChannels]) {
    if ("start" in message) this.store("start");
    if ("data" in message) this.store("data", message.data);

    if ("error" in message) {
      const error = Client.deserializeError(message.error);
      this.error(error);
    }

    if ("end" in message) this.store("end");
  }
}
