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

  /**
   * Creates a class for easier DX for interacting with actors
   */
  for<Kind extends keyof Props["instances"]>(kind: Kind) {
    type Current = InstanceType<Props["instances"][Kind]>;
    type InstanceEvent = Parameters<Current["handleIncomingEvent"]>[0];
    type InstanceEventBus = Parameters<Current["emit"]>;
    type InstanceData = Parameters<Current["save"]>[0];

    type ExtractMethodNames<T> = {
      [K in keyof T]: T[K] extends (...args: any) => any ? K : never;
    }[keyof T];
    type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

    type ForbiddenMethods = ExtractMethodNames<Instance>;

    const client = this;

    const Constructor = class {
      id: number;

      constructor(actorId: number) {
        this.id = actorId;
        const actorClient = client.actor(kind, this.id);

        const self = this;
        return new Proxy(this, {
          get: (target, prop, receiver) => {
            if (prop in target) return Reflect.get(target, prop, receiver);
            if (typeof prop !== "string") return;

            return actorClient[prop];
          },
        });
      }
    };

    type AvailableMethods = Omit<Current, keyof Instance>;
    return Constructor as any as new (actorId: number) => AvailableMethods;
  }

  on<Callback extends (...args: any[]) => any>(
    channel: string,
    callback: Callback,
  ) {
    return this.adapters.eventBus.on(channel, callback);
  }

  actor<Kind extends keyof Props["instances"]>(kind: Kind, actorId: number) {
    type Current = InstanceType<Props["instances"][Kind]>;
    type InstanceEvent = Parameters<Current["handleIncomingEvent"]>[1];
    type InstanceEventBus = Parameters<Current["emit"]>;
    type InstanceData = Parameters<Current["save"]>[0];

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

    const actorClientAPI = {
      getState: () => {
        return this.adapters.snapshot.get<InstanceData>(actorId);
      },

      on: (
        channel: InstanceEventBus[0],
        callback: (data: InstanceEventBus[1]) => any,
      ) => {
        return this.adapters.eventBus.on(channel, callback);
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
              const subscription = actorClientAPI.on(
                `actor:${actorId}:event:${eventId}`,
                (data) => {
                  resolve(data);
                  subscription.unsubscribe();
                },
              );
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

    return new Proxy(
      actorClientAPI as typeof actorClientAPI &
        RemoteMethodes & { just: JustRemoteMethodes },
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
