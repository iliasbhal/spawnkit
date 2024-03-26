import { Instance } from "./Instance";
import { Adapters, ScheduleEvent } from "./adapters";

type InstanceClass = typeof Instance<any>;

interface ClientProps<T extends InstanceClass = InstanceClass> {
  instances: T[];
  adapters: Omit<Adapters, "lock" | "worker">;
}

export class Client<Props extends ClientProps> {
  private adapters: Props["adapters"];

  constructor(opts: Props) {
    this.adapters = opts.adapters;
  }

  static from(opts: ClientProps) {
    return new Client(opts);
  }

  private onEvent(
    id: number,
    callback: (
      eventData: Parameters<
        Parameters<typeof this.adapters.events.subscribe>[1]
      >[0]["data"],
    ) => any,
  ) {
    return this.adapters.events.subscribe(id, (event) => callback(event.data));
  }

  private onData(
    id: number,
    callback: Parameters<typeof this.adapters.snapshot.subscribe>[1],
  ) {
    return this.adapters.snapshot.subscribe(id, callback);
  }

  actor(kind: string, id: number) {
    const subscribers = {
      event: this.onEvent,
      data: this.onData,
    };

    return {
      send: async (eventData: ScheduleEvent) => {
        // when sending an event, we shall always try to spawn an instance
        // to ensure that the event will be processed
        return await Promise.all([
          this.adapters.events.publish(id, eventData),
          this.adapters.scheduler.schedule({
            id: id,
            kind: kind,
          }),
        ]);
      },
      get: () => {
        return this.adapters.snapshot.get(id);
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
            return this.onData(id, callback as Subscriber<"data">);
          case "event":
            return this.onEvent(id, callback as Subscriber<"event">);
          default:
            throw new Error("Unsupported Event Type");
        }
      },
    };
  }
}
