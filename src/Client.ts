import { Instance } from "./Instance";
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

  private onEvent<InstanceEvent>(
    id: number,
    callback: (
      eventData: Parameters<
        Parameters<typeof this.adapters.events.subscribe<InstanceEvent>>[1]
      >[0]["data"],
    ) => any,
  ) {
    return this.adapters.events.subscribe<InstanceEvent>(id, (event) =>
      callback(event.data),
    );
  }

  private onData<Data>(
    id: number,
    callback: Parameters<typeof this.adapters.snapshot.subscribe<Data>>[1],
  ) {
    return this.adapters.snapshot.subscribe(id, callback);
  }

  actor<Kind extends keyof Props["instances"]>(kind: Kind, actorId: number) {
    type InstanceEvent = Parameters<
      InstanceType<Props["instances"][Kind]>["onEvent"]
    >[0];

    type InstanceData = Parameters<
      InstanceType<Props["instances"][Kind]>["save"]
    >[0];

    const subscribers = {
      event: this.onEvent<InstanceEvent>,
      data: this.onData<InstanceData>,
    };

    return {
      send: async (eventData: InstanceEvent) => {
        // when sending an event, we shall always try to spawn an instance
        // to ensure that the event will be processed
        const [eventId] = await Promise.all([
          this.adapters.events.publish(actorId, eventData),
          this.adapters.scheduler.schedule({
            id: actorId,
            kind: kind.toString(),
          }),
        ]);

        return eventId;
      },
      get: () => {
        return this.adapters.snapshot.get<InstanceData>(actorId);
      },

      on: <
        Type extends keyof typeof subscribers,
        Callback extends Parameters<(typeof subscribers)[Type]>[1],
      >(
        type: Type,
        callback: Callback,
      ) => {
        type Subscriber<T extends keyof typeof subscribers> = Parameters<
          (typeof subscribers)[T]
        >[1];

        switch (type) {
          case "data":
            return this.onData(actorId, callback as Subscriber<"data">);
          case "event":
            return this.onEvent(actorId, callback as Subscriber<"event">);
          default:
            throw new Error("Unsupported Event Type");
        }
      },
    };
  }
}
