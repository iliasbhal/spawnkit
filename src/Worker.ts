import { Instance } from "./Instance";
import { Lock } from "./Lock";
import { Adapters, ScheduleData } from "./adapters";

type InstanceClass = typeof Instance<any>;

interface ListenProps<T extends InstanceClass = InstanceClass> {
  instances: Record<string, T>;
  adapters: Adapters;
}

export class Worker {
  static listen(opts: ListenProps) {
    const { instances, adapters } = opts;
    Worker.verify(instances);

    if (process.env.NODE_ENV !== "test") {
      Object.keys(instances).forEach((kind) => {
        console.log(`ActorWorker ready to handle "${kind}" actors`);
      });
    }

    return adapters.worker.subscribe(async (event) => {
      const machine = instances[event.kind];
      if (!machine) {
        throw new Error("Machine Not implemented");
      }

      return await Worker.handleEvent(machine, event, adapters);
    });
  }

  static async handleEvent(
    Instance: InstanceClass,
    event: ScheduleData,
    adapters: ListenProps<any>["adapters"],
  ) {
    try {
      const instance = new Instance(event, adapters);
      await instance.run();
    } catch (err) {
      const shouldSilenceError =
        err instanceof Lock.AcquireLockError || err instanceof Lock.ExtendError;
      if (!shouldSilenceError) {
        console.log("THROWN", err);
        throw err;
      } else {
        // console.log("-->", err);
      }
    }
  }

  static verify(instances: ListenProps["instances"]) {
    const kinds = new Set<string>();

    if (Object.keys(instances).length === 0) {
      throw new Error(`Validation Error: worker configured with 0 actors`);
    }

    Object.values(instances).forEach((Instance) => {
      const kind = Instance.kind;
      const isAlreadyDefined = kinds.has(Instance.kind);
      if (isAlreadyDefined) {
        throw new Error(
          `Machine Error: machines should have distinct meta.kind ( received 2 "${kind}" )`,
        );
      } else {
        kinds.add(kind);
      }
    });
  }
}
