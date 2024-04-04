import wait from "wait";
import { Instance } from "./Instance";
import { Lock } from "./Lock";
import {
  Adapters,
  ScheduleByType,
  ScheduleEventData,
  ScheduleInstanceData,
} from "../adapters";
import { Client } from "./Client";

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
  client: Client<{
    instances: Record<string, T>;
    adapters: Adapters;
  }>;

  constructor(config: ListenProps<T>) {
    this.instances = config.instances;
    this.adapters = config.adapters;
    this.client = new Client({
      instances: config.instances,
      adapters: config.adapters,
    });
  }

  start() {
    const subscription = this.adapters.scheduler.subscribe(
      async (type, data) => {
        // console.log("WORKER", type);
        if (type === "event") {
          return await this.callInstanceMethod(data as ScheduleEventData);
        }

        if (type === "instance") {
          return await this.tryInstantiateInstance(
            data as ScheduleInstanceData,
          );
        }
      },
    );

    this.stopCallback = subscription.unsubscribe;
  }

  private stopCallback?: Function;
  stop() {
    this.stopCallback?.();
  }

  private async callInstanceMethod(scheduleEvent: ScheduleByType["event"]) {
    // console.log("scheduleEvent", scheduleEvent);

    const { kind, id } = scheduleEvent.instance;
    const { action, args } = scheduleEvent.event;

    const actorAPI = this.client.actor(kind, id);

    // @ts-ignore
    await actorAPI.emit[action](...args);
  }

  private async tryInstantiateInstance(
    instanceConfig: ScheduleByType["instance"],
  ) {
    const Instance = this.instances[instanceConfig.kind];
    if (!Instance) {
      throw new Error("Machine Not implemented");
    }

    try {
      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const MIN_LOCK_DURATION = 5_000;

      const lockConfig = {
        lockId: `redlock:${instanceConfig.id}`,
        duration: MIN_LOCK_DURATION,
      };

      // When instantiating a new actor, we should acquire a lock
      // So that only one worker in the cloud is instantiating the actor
      // This is to prevent from executing side effects twice and race conditions.
      const lock = new Lock(lockConfig, this.adapters.lock);
      const result = await lock.using(async (abortSignal) => {
        const instance = new Instance(instanceConfig, this.adapters);
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

          const hasUnprocessedEvents = await this.adapters.messages.has(
            instanceConfig.id,
          );
          if (hasUnprocessedEvents) {
            this.adapters.scheduler.instance({
              kind: instanceConfig.kind,
              id: instanceConfig.id,
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
        // console.log(`ActorWorker ready to handle "${kind}" actors`);
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
