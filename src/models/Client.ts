import type { Instance } from "./Instance";
import type {
  InstanceEventChannels,
  InstanceEventStreamMessage,
} from "./InstanceProxy";
import { ClientStream } from "./ClientStream";
import { RemoteError } from "./RemoteError";
import {
  Adapters,
  ScheduleId,
  Cron,
  Delay,
  InstanceId,
  EventId,
  InstanceMethodCall,
  BaseAdapter,
} from "../adapters";
import { ClientData } from "./ClientData";
import { Queue } from "./Queue";
import { nanoid } from "nanoid";

export interface SpawnkitConfig {
  adapters: Adapters;
  instances: { [key: string]: typeof Instance<any, any> };
}

type InternalMessageData = InstanceEventChannels[keyof InstanceEventChannels];

export class Client<CP extends SpawnkitConfig> {
  private adapters: CP["adapters"];
  private instances: CP["instances"];
  id = nanoid();

  constructor(opts: CP) {
    this.adapters = opts.adapters;
    this.instances = opts.instances;

    this.linkAndValidateAdapters();
    this.validateInstancces();
  }

  private linkAndValidateAdapters = () => {
    Object.values(this.adapters).forEach((adapter) => {
      if (adapter instanceof BaseAdapter) {
        adapter.link(this);
        return;
      }

      throw new Error("Invalid Adapter, need to extend BaseAdapter");
    });
  }

  private validateInstancces = () => {
    Object.values(this.instances).forEach((InstanceClass: any) => {
      const inst = new InstanceClass();
      const instanceName = InstanceClass.name;

      const clientInst = this.spawn(instanceName, '__TEST_ID__');
      const clientKeys = new Set(Object.keys(clientInst));
      const instanceKeys = new Set(Object.getOwnPropertyNames(
        Object.getPrototypeOf(inst)).concat(Object.keys(inst))
      );

      const instanceProtoKeys = new Set(Object.getOwnPropertyNames(
        Object.getPrototypeOf(Object.getPrototypeOf(inst)))
      );

      const intersect = new Set([...Array.from(clientKeys)].filter(i => instanceKeys.has(i)));
      const cannotUseKeys = new Set([...Array.from(intersect)].filter(i => !instanceProtoKeys.has(i)));

      if (cannotUseKeys.size > 0) {
        throw new Error(`Cannot use reserved keys: ${Array.from(cannotUseKeys).join(', ')} in instance ${instanceName}`);
      }
    });
  }

  static from<CP extends SpawnkitConfig>(opts: CP) {
    return new Client<CP>(opts);
  }

  static getChannelForEventResponse(eventId: EventId) {
    return `reply:${eventId}` as const;
  }
  static getChannelForEventBus<Channel extends string>(
    type: string,
    channel: Channel,
  ) {
    return `broadcast:${type}:${channel}` as const;
  }

  static getChannelForHealthSignal<Channel extends string>(
    type: string,
    channel: Channel,
  ) {
    return `broadcast:${type}:${channel}:__INTERNAL__health` as const;
  }

  worker: Queue<any> | null = null;
  public start() {
    const forwardOptions = {
      adapters: this.adapters,
      instances: this.instances,
    } as any;

    const workerQueue = Queue.from(forwardOptions, this);
    return workerQueue.start();
  }

  public stop() {
    return this.worker?.stop();
  }

  timestampByInstance = new Map<InstanceId, number>();
  private shouldScheduleInstance(instanceId: InstanceId) {
    const now = Date.now();
    const lastSentEventTimesamp = this.timestampByInstance.get(instanceId);
    this.timestampByInstance.set(instanceId, now);

    if (!lastSentEventTimesamp) {
      return true;
    }

    const timeSinceLastEventSent = now - lastSentEventTimesamp;
    const shouldScheduleInstance = timeSinceLastEventSent > 1000;
    return shouldScheduleInstance;
  }

  private tryWakeInstanceUp<Kind extends Extract<keyof CP["instances"], string>>(kind: Kind, instanceId: InstanceId) {
    // In the case that we are sending a lot of events
    // We don't have to try to schedule an instance together with every event we send.
    // Once an instance terminate, it will try again 3 times to check if there are pending events process.
    // We can rely on this fact to only schedule an instance if it has been a long time since last event push.
    // This is mainly to avoid adding unnessessary pressure the backend.
    const canScheduleInstance = this.shouldScheduleInstance(instanceId);
    if (canScheduleInstance) {
      this.adapters.instances.schedule({
        id: instanceId,
        kind: kind.toString(),
      })
    }
  }

  spawn<Kind extends Extract<keyof CP["instances"], string>>(
    kind: Kind,
    instanceId: InstanceId,
  ) {
    type Inst = InstanceType<CP["instances"][Kind]>;
    type InstanceData = Inst["__types"]["InstanceData"];
    type InstanceChannels = Inst["__types"]["InstanceChannels"];
    type InheritedMethods = Exclude<ExtractMethodNames<Instance>, undefined>;
    type AvailableMethods = Omit<ExtractMethods<Inst>, InheritedMethods>;
    type RemoteMethodes = MakeRemote<AvailableMethods>;
    type SkipRemoteMethods = MakeSkippable<AvailableMethods>;
    type ScheduleRemoteMethods = MakeSchedulable<AvailableMethods>;

    const instanceIdentifier = {
      id: instanceId,
      kind: kind.toString(),
    };

    const sendEventToInstance = async (
      methodCallConfig: InstanceMethodCall,
    ) => {
      const [_, eventId] = await Promise.all([
        // when sending an event, we shall always try to spawn an instance
        // to ensure that the event will be processed
        this.tryWakeInstanceUp(kind, instanceId),
        this.adapters.messages.publish(
          instanceIdentifier,
          `rpc`,
          methodCallConfig,
        ),
      ]);

      return eventId;
    };

    const createHealthSignal = (config: { maxWait: number }) => {
      const abortCtl = new AbortController();

      const createHealthTimeout = () => {
        return {
          id: null as any,
          start: () => {
            healthTimeout.id = setTimeout(() => abortCtl.abort(), config.maxWait);
          },
          reset: () => {
            healthTimeout.dispose();
            healthTimeout.start();
          },
          dispose: () => {
            if (healthTimeout.id) clearTimeout(healthTimeout.id);
          }
        };
      }

      const healthTimeout = createHealthTimeout();
      healthTimeout.start();
      const subscription = this.adapters.messages.subscribe<InternalMessageData>(
        instanceIdentifier,
        Client.getChannelForEventBus("__INTERNAL__", 'health'),
        (message) => {
          healthTimeout.reset();
        },
      );

      const onAbortCallbacks: (() => void)[] = [];
      const addAbortCallback = (abortCallback: () => void) => {
        abortCtl.signal.addEventListener("abort", abortCallback);
        onAbortCallbacks.push(abortCallback);
      }

      addAbortCallback(() => {
        healthTimeout.dispose()
      });

      return {
        signal: abortCtl.signal,
        onAbort: addAbortCallback,
        reset: () => healthTimeout.reset(),
        unsunbscribe: () => {
          subscription.unsubscribe();
          healthTimeout.dispose();

          onAbortCallbacks.forEach(callback => {
            abortCtl.signal.removeEventListener("abort", callback);
          });
        },
      }
    }

    const data = new ClientData<InstanceData>({
      adapters: this.adapters,
      instance: instanceIdentifier,
    });

    const createScheduledMethodHandler = () => {
      type CommonScheduleConfig = {
        name?: string;
      };

      return (schedule: CommonScheduleConfig & (Delay | Cron)) => {
        return new Proxy({} as ScheduleRemoteMethods, {
          get: (target, prop, receiver) => {
            if (prop in target) return Reflect.get(target, prop, receiver);
            if (typeof prop !== "string") return;

            return async (...args: any[]) => {
              const scheduleId = await this.adapters.events.schedule({
                schedule: schedule,
                instance: {
                  id: instanceId,
                  kind: kind.toString(),
                },
                event: {
                  action: prop,
                  args,
                  mode: "scheduled",
                  context: {},
                },
              });

              return scheduleId;
            };
          },
        });
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

          if (mode === 'skip') return true;
          if (mode === 'scheduled') return true;

          if (mode === "normal") {
            return new Promise((resolve, reject) => {
              const healthCheck = createHealthSignal({ maxWait: 5000 });
              const internalStream = new ClientStream();
              const scope = {
                response: undefined as any,
              };

              const isDoneWaitingForResponse = () => {
                healthCheck.unsunbscribe();
                internalStream.close();
                scope.response?.unsubscribe();
              }

              healthCheck.onAbort(() => {
                isDoneWaitingForResponse();
                const error = new Error("Spawnkit Instance Timeout");
                reject(error);
              });

              internalStream.on("end", () => {
                isDoneWaitingForResponse();
              });

              const handleStreamMessage = (message: InstanceEventStreamMessage) => {
                resolve(internalStream);
                internalStream.forward(message);
              };

              const handleDefaultMessage = (message: InternalMessageData) => {
                isDoneWaitingForResponse();

                if ("error" in message) {
                  const error = RemoteError.deserialize(message.error);
                  reject(error);
                  return;
                }

                if ("response" in message) {
                  resolve(message.response);
                  return;
                }
              };

              const channel = Client.getChannelForEventResponse(eventId);
              scope.response = this.adapters.messages.subscribe<InternalMessageData>(
                instanceIdentifier,
                channel,
                (message) => {
                  if ("stream" in message.data)
                    return handleStreamMessage(message.data);
                  if ("response" in message.data)
                    return handleDefaultMessage(message.data);
                  if ("error" in message.data)
                    return handleDefaultMessage(message.data);
                },
              );
            });
          }

          throw new Error("Not Implemented");
        };
      };
    };

    const scheduleRemoteMethodHandler = createScheduledMethodHandler();
    const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
    const skipRemoteMethodHandler = createRemoteMethodHandler("skip");

    const instanceClientAPI = {
      id: instanceId,
      kind: kind,

      async emit<Channel extends Extract<keyof InstanceChannels, string>>(
        channel: Channel,
        message: InstanceChannels[Channel],
      ) {
        await skipRemoteMethodHandler("emit")(channel, message);
        return true;
      },

      on: <Channel extends Extract<keyof InstanceChannels, string>>(
        channel: Channel,
        callback: (data: InstanceChannels[Channel]) => any,
      ) => {
        const healthCheck = createHealthSignal({ maxWait: 5000 });
        const subscribe = this.adapters.messages.subscribe<InstanceChannels[Channel]>(
          instanceIdentifier,
          Client.getChannelForEventBus("instance", channel.toString()),
          (message) => {
            healthCheck.reset();
            callback(message.data);
          },
        );

        const dispose = () => {
          subscribe.unsubscribe();
          healthCheck.unsunbscribe();
        }

        healthCheck.onAbort(() => {
          dispose();
        })

        return {
          unsubscribe: () => {
            healthCheck.unsunbscribe();
            dispose();
          },
        };
      },

      data: data,

      __INTERNAL__: {
        sendEventToInstance,
        wakeUpInstance: () => this.tryWakeInstanceUp(kind, instanceId),
      },

      schedule: scheduleRemoteMethodHandler,
      scheduled: {
        list: async () => {
          return this.adapters.events.list(kind, instanceId);
        },
        cancel: async (scheduleId: ScheduleId) => {
          return this.adapters.events.cancel(kind, instanceId, scheduleId);
        },
        delete: async (scheduleId: ScheduleId) => {
          return this.adapters.events.delete(kind, instanceId, scheduleId);
        },
        get: async (scheduleId: ScheduleId) => {
          return this.adapters.events.get(kind, instanceId, scheduleId);
        },
      },
    } as const;

    // We use the Kind type here just o it to show nicely
    // in the intelissense. it will show as Remote<OrderBook> for example
    type Spawn<Kind> = RemoteMethodes & typeof instanceClientAPI;

    return new Proxy(instanceClientAPI, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        if (typeof prop !== "string") return;
        return normalRemoteMethodHandler(prop);
      },
    }) as Spawn<Inst>;
  }
}

// Utility Types:

type ExtractMethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

type MakeRemote<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
  ? // If the function is sychronouse, we want to cast the return to a Promise
  // And it it's already a promise, it's gonna stay a promise.
  (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
  : never;
};

type MakeSkippable<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
  ? (...args: Parameters<T[K]>) => Promise<boolean>
  : never;
};

type MakeSchedulable<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
  ? (...args: Parameters<T[K]>) => Promise<ScheduleId>
  : never;
};
