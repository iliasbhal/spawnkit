import wait from "wait";
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
      const Instance = instances[event.kind];
      if (!Instance) {
        throw new Error("Machine Not implemented");
      }

      return await Worker.handleEvent(Instance, event, adapters);
    });
  }

  static async handleEvent(
    Instance: InstanceClass,
    event: ScheduleData,
    adapters: ListenProps<any>["adapters"],
  ) {
    try {
      const instance = new Instance(event, adapters);
      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const MIN_LOCK_DURATION = 30_000;

      const lockConfig = {
        lockId: `redlock:${event.id}`,
        duration: MIN_LOCK_DURATION,
      };

      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const lock = new Lock(lockConfig, adapters.lock);
      const result = await lock.using(async (abortSignal) => {
        await instance.run(abortSignal);
      });

      // // In order to make sure that we didn't miss any event and to avoid any race conditions
      // // we'll check if there any event left to process. But we do it outside of the lock.
      // // This will ensure that if there is another process trying to pick up those event
      // // this process doesn't acquire the lock.
      Promise.resolve().then(async () => {
        const waitTimeBeforeAttemp = [200, 400, 800];

        for (const waitTime of waitTimeBeforeAttemp) {
          await wait(waitTime);

          const hasUnprocessedEvents = await adapters.events.has(event.id);
          if (hasUnprocessedEvents) {
            adapters.scheduler.schedule({
              kind: event.kind,
              id: event.id,
            });
          }
        }
      });

      return result;
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
    if (Object.keys(instances).length === 0) {
      throw new Error(`Validation Error: worker configured with 0 actors`);
    }
  }
}
