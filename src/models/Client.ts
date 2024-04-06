import type { Instance as SpawnkitInstance } from "./Instance";
import {
  Adapters,
  ScheduleEventData,
  ScheduleId,
  ScheduleConfig,
  Cron,
  Delay,
  InstanceId,
  EventId,
} from "../adapters";
import { Stream } from "./Stream";

type InstanceClass = typeof SpawnkitInstance<any>;

interface ClientProps<T extends InstanceClass = InstanceClass> {
  instances: Record<string, T>;
  adapters: Omit<Adapters, "lock" | "worker">;
}

export class RemoteError extends Error {}

export class Client<Props extends ClientProps> {
  private adapters: Props["adapters"];

  constructor(opts: Props) {
    this.adapters = opts.adapters;
  }

  static from<P extends ClientProps>(opts: P) {
    return new Client(opts);
  }

  static getChannelForEventResponse(instanceId: InstanceId, eventId: EventId) {
    return `instance:${instanceId}:event:${eventId}` as const;
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

  static handleIncomingStream() {}

  spawn<Kind extends keyof Props["instances"]>(
    kind: Kind,
    instanceId: InstanceId,
  ) {
    type Instance = InstanceType<Props["instances"][Kind]>;
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

    let lastEventSentAt: number | null = null;
    const checkShouldScheduleWithEventSent = () => {
      if (!lastEventSentAt) {
        lastEventSentAt = Date.now();
        return true;
      }

      const timeSinceLastEventSent = Date.now() - lastEventSentAt;
      const shouldScheduleInstance = timeSinceLastEventSent > 1000;
      lastEventSentAt = Date.now();
      return shouldScheduleInstance;
    };

    const sendEventToInstance = async (event: InstanceEvent) => {
      const shouldScheduleInstance = checkShouldScheduleWithEventSent();
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

    const onInternalEmit = (
      channel: InstanceInternalEmittable[0],
      callback: (data: InstanceInternalEmittable[1]) => any,
    ) => {
      return this.adapters.pubsub.on(channel, callback);
    };

    const instanceClientAPI = {
      id: instanceId,
      kind: kind,

      on: (
        channel: InstanceEmittable[0],
        callback: (data: InstanceEmittable[1]) => any,
      ) => {
        return this.adapters.pubsub.on(channel, callback);
      },

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

    const createRemoteMethodHandler = (mode: InstanceEvent["mode"]) => {
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
                instanceId,
                eventId,
              );

              type Subscription = ReturnType<typeof onInternalEmit>;
              type Message = Parameters<
                Parameters<typeof onInternalEmit>[1]
              >[0];

              const incomingStream = new Stream<any>(() => {});
              const handleStreamMessage = (
                subscription: Subscription,
                message: Message,
              ) => {
                if ("start" in message) {
                  incomingStream.store("start");
                  resolve(incomingStream);
                }

                if ("data" in message) {
                  incomingStream.store("data", message.data);
                }

                if ("end" in message) {
                  incomingStream.store("end");
                  subscription.unsubscribe();
                }
              };

              const handleDefaultMessage = (
                subscription: Subscription,
                message: Message,
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

              const subscription = onInternalEmit(channelID, (message) => {
                if ("stream" in message)
                  return handleStreamMessage(subscription, message);
                if ("response" in message)
                  return handleDefaultMessage(subscription, message);
              });
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
