import type { Instance } from "./Instance";
import { Adapters } from "./adapters";

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

    const sendEventToActor = async (event: InstanceEvent) => {
      // when sending an event, we shall always try to spawn an instance
      // to ensure that the event will be processed
      const [eventId] = await Promise.all([
        this.adapters.events.publish(actorId, event),
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
      return this.adapters.pubsub.on(channel, callback) as any;
    };

    const actorClientAPI = {
      on: (
        channel: InstanceEmittable[0],
        callback: (data: InstanceEmittable[1]) => any,
      ) => {
        return this.adapters.pubsub.on(channel, callback);
      },
    };

    const createRemoteMethodHandler = (mode: "just" | "normal") => {
      return (action: string) => {
        return async (...args: any[]) => {
          const eventId = await sendEventToActor({
            action,
            args,
            mode,
          });

          if (mode === "just") {
            return eventId;
          }

          if (mode === "normal") {
            return new Promise((resolve) => {
              const channelID = Client.getChannelForEventResponse(
                actorId,
                eventId,
              );
              const subscription = onInternalEmit(channelID, (data) => {
                resolve(data);
                subscription.unsubscribe();
              });
            });
          }

          throw new Error("Not Implemented");
        };
      };
    };

    const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
    const justRemoteMethodHandler = createRemoteMethodHandler("just");

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
      RemoteMethodes & { just: JustRemoteMethodes };

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
