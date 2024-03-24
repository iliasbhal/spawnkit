import { InstanceLock, InstanceEvent, ActorLaunchConfig } from "./repositories";
import { Instance } from "./Instance";

type InstanceClass = typeof Instance<any>;

interface ListenProps<T extends InstanceClass = InstanceClass> {
  instances: T[];
  concurrency?: number;
}

export class Worker {
  static async handleEvent(Instance: InstanceClass, event: ActorLaunchConfig) {
    const runConfig =
      "id" in event
        ? {
            kind: event.kind,
            id: event.id,
          }
        : {
            kind: event.kind,
            input: event.input,
          };

    const instance = new Instance(runConfig);

    try {
      await instance.run();
    } catch (err) {
      const shouldSilenceError =
        err instanceof InstanceLock.LockError ||
        err instanceof InstanceLock.ExtendError;
      if (!shouldSilenceError) {
        console.log("THROWN", err);
        throw err;
      } else {
        // console.log("-->", err);
      }
    }
  }

  static listen(opts: ListenProps) {
    const { instances } = opts;
    Worker.verify(instances);

    if (process.env.NODE_ENV !== "test") {
      Object.keys(instances).forEach((kind) => {
        console.log(`ActorWorker ready to handle "${kind}" actors`);
      });
    }

    const inctanceByKind = instances.reduce(
      (acc, Instance) => {
        const kind = Instance.kind;
        acc[kind] = Instance;
        return acc;
      },
      {} as Record<string, InstanceClass>,
    );

    return InstanceEvent.subscribeToNewEvents(
      {
        concurrency: opts.concurrency || 50,
      },
      async (event) => {
        const machine = inctanceByKind[event.kind];
        if (!machine) {
          throw new Error("Machine Not implemented");
        }

        return await Worker.handleEvent(machine, event);
      },
    );
  }

  static verify(instances: ListenProps["instances"]) {
    const kinds = new Set<string>();

    if (instances.length === 0) {
      throw new Error(`Machine Validation: worker configured with 0 actors`);
    }

    instances.forEach((Instance) => {
      const kind = Instance.kind;
      const isAlreadyDefined = kinds.has(Instance.kind);
      if (isAlreadyDefined) {
        throw new Error(
          `Machine Validation: machines should have distinct meta.kind ( received 2 "${kind}" )`,
        );
      } else {
        kinds.add(kind);
      }
    });
  }
}
