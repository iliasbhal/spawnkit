import wait from "wait";
import { Instance } from "./Instance";
import { Lock } from "./Lock";
import { Adapters, ScheduleData } from "../adapters";

type InstanceClass = typeof Instance<any>;

interface ListenProps<T extends InstanceClass = InstanceClass> {
  instances: Record<string, T>;
  adapters: Adapters;
}

export class Worker<T extends InstanceClass = InstanceClass>
  implements ListenProps<T>
{
  instances: Record<string, T>;
  adapters: Adapters;

  constructor(config: ListenProps<T>) {
    this.instances = config.instances;
    this.adapters = config.adapters;
  }

  start() {
    const subscription = this.adapters.worker.subscribe(async (event) => {
      const Instance = this.instances[event.kind];
      if (!Instance) {
        throw new Error("Machine Not implemented");
      }

      return await this.handleEvent(Instance, event);
    });

    this.stopCallback = subscription.unsubscribe;
  }

  private stopCallback?: Function;
  stop() {
    this.stopCallback?.();
  }

  private async handleEvent(Instance: InstanceClass, event: ScheduleData) {
    try {
      const instance = new Instance(event, this.adapters);
      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const MIN_LOCK_DURATION = 5_000;

      const lockConfig = {
        lockId: `redlock:${event.id}`,
        duration: MIN_LOCK_DURATION,
      };

      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const lock = new Lock(lockConfig, this.adapters.lock);
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

          const hasUnprocessedEvents = await this.adapters.events.has(event.id);
          if (hasUnprocessedEvents) {
            this.adapters.scheduler.schedule({
              kind: event.kind,
              id: event.id,
            });
          }
        }
      });

      return result;
    } catch (err) {
      const shouldSilenceError =
        err instanceof Lock.AcquireLockError ||
        err instanceof Lock.ExtendError ||
        err instanceof Lock.ReleaseError;
      if (shouldSilenceError) {
        return;
      }

      console.error(err);
      throw err;
    }
  }

  static from<O extends ListenProps>(opts: O) {
    Worker.verify(opts.instances);

    if (process.env.NODE_ENV !== "test") {
      Object.keys(opts.instances).forEach((kind) => {
        console.log(`ActorWorker ready to handle "${kind}" actors`);
      });
    }

    return new Worker(opts);
  }

  static verify(instances: ListenProps["instances"]) {
    if (Object.keys(instances).length === 0) {
      throw new Error(`Validation Error: worker configured with 0 actors`);
    }
  }
}
