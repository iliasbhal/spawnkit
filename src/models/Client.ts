import type { Instance } from "./Instance";
import { Adapters } from "../adapters";
import { Stream } from "./Stream";

type InstanceClass = typeof Instance<any>;

interface ClientProps<T extends InstanceClass = InstanceClass> {
  instances: Record<string, T>;
  adapters: Omit<Adapters, "lock" | "worker">;
}

export class Client<Props extends ClientProps> {
  private adapters: Props["adapters"];

  constructor(opts: Props) {
    this.adapters = opts.adapters;
  }

  static from<P extends ClientProps>(opts: P) {
    return new Client(opts);
  }

  static getChannelForEventResponse(actorId: number, eventId: number) {
    return `actor:${actorId}:event:${eventId}` as const;
  }

  static handleIncomingStream() {}

  actor<Kind extends keyof Props["instances"]>(kind: Kind, actorId: number) {
    type Current = InstanceType<Props["instances"][Kind]>;
    type InstanceEvent = Parameters<Current["callMethodDefinedInEvent"]>[1];
    type InstanceEmittable = Parameters<Current["emitExternal"]>;
    type InstanceInternalEmittable = Parameters<Current["emitInternal"]>;

    type ExtractMethodNames<T> = {
      [K in keyof T]: T[K] extends (...args: any) => any ? K : never;
    }[keyof T];
    type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

    type ForbiddenMethods = ExtractMethodNames<Instance>;
    type AvailableMethods = Omit<ExtractMethods<Current>, ForbiddenMethods>;
    type RemoteMethodes = {
      [key in keyof AvailableMethods]: (
        // @ts-ignore
        ...args: Parameters<AvailableMethods[key]>
        //@ts-ignore
      ) => Promise<Awaited<ReturnType<AvailableMethods[key]>>>;
    };

    type JustRemoteMethodes = {
      [key in keyof AvailableMethods]: (
        // @ts-ignore
        ...args: Parameters<AvailableMethods[key]>
        //@ts-ignore
      ) => Promise<true>;
    };

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

    const sendEventToActor = async (event: InstanceEvent) => {
      const shouldScheduleInstance = checkShouldScheduleWithEventSent();
      const [eventId] = await Promise.all([
        this.adapters.events.publish(actorId, event),

        // when sending an event, we shall always try to spawn an instance
        // to ensure that the event will be processed except In the case that we are sending a lot of events
        // We don't have to try t schedule an instance together with every event we send.
        // Once an instance terminate, it will try again 3 times to check if there are pending events process.
        // We can rely on this fact to only schedule an instance if it has been a long time since last event push.
        // This is mainly to avoid adding unnessary pressure the the backend.
        // Scheduling too often is guarenteed to fail often as theu won't be able to acquire the locks
        shouldScheduleInstance &&
          this.adapters.scheduler.schedule({
            id: actorId,
            kind: kind.toString(),
          }),
      ]);

      return eventId;
    };

    const onInternalEmit = (
      channel: InstanceInternalEmittable[0],
      callback: (data: InstanceInternalEmittable[1]) => any,
    ) => {
      return this.adapters.pubsub.on(channel, callback);
    };

    const actorClientAPI = {
      on: (
        channel: InstanceEmittable[0],
        callback: (data: InstanceEmittable[1]) => any,
      ) => {
        return this.adapters.pubsub.on(channel, callback);
      },
    };

    const createRemoteMethodHandler = (mode: InstanceEvent["mode"]) => {
      return (action: string) => {
        return async (...args: any[]) => {
          const eventId = await sendEventToActor({
            action,
            args,
            mode,
          });

          if (mode === "emit") {
            return eventId;
          }

          if (mode === "normal") {
            return new Promise((resolve) => {
              const channelID = Client.getChannelForEventResponse(
                actorId,
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

    const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
    const justRemoteMethodHandler = createRemoteMethodHandler("emit");

    const actorJustClientAPI = new Proxy(
      {},
      {
        get(target, prop, receiver) {
          if (prop in target) return Reflect.get(target, prop, receiver);
          if (typeof prop !== "string") return;
          return justRemoteMethodHandler(prop);
        },
      },
    );

    // We use the Kind type here just o it to show nicely
    // in the intelissense. it will show as Remote<OrderBook> for example
    type Remote<Kind> = typeof actorClientAPI &
      RemoteMethodes & { emit: JustRemoteMethodes };

    return new Proxy(
      actorClientAPI as Remote<InstanceType<Props["instances"][Kind]>>,
      {
        get(target, prop, receiver) {
          if (prop in target) return Reflect.get(target, prop, receiver);
          if (typeof prop !== "string") return;

          if (prop === "just") {
            return actorJustClientAPI;
          }

          return normalRemoteMethodHandler(prop);
        },
      },
    );
  }
}
