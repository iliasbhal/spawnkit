import wait from "wait";
import { Lock } from "./Lock";
import {
  InstanceId,
  ScheduleByType,
  ScheduleContext,
  ScheduleEventData,
  ScheduleInstanceData,
} from "../adapters";
import { Client, SpawnkitConfig } from "./Client";
import { InstanceProxy } from "./InstanceProxy";
import { Data } from "./Data";

export class Worker<O extends SpawnkitConfig> {
  instances: O["instances"];
  adapters: O["adapters"];
  client: Client<O>;

  constructor(config: O) {
    this.instances = config.instances;
    this.adapters = config.adapters;
    this.client = new Client(config);
  }

  start() {
    const subscription = this.adapters.scheduler.subscribe(
      async (type, data, context) => {
        if (type === "event") {
          return await this.callInstanceMethod(
            data as ScheduleEventData,
            context,
          );
        }

        if (type === "instance") {
          return await this.tryInstantiateInstance(
            data as ScheduleInstanceData,
            context,
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

  private getData(instanceId: InstanceId) {
    const data = new Data<any>({
      adapters: this.adapters,
      instanceId: instanceId,
    });

    return data;
  }

  private async callInstanceMethod(
    scheduleEvent: ScheduleByType["event"],
    context: ScheduleContext,
  ) {
    const { kind, id } = scheduleEvent.instance;
    const { action, args } = scheduleEvent.event;

    console.log(
      `Scheduled Event: kind:${kind} id:${id} action:${action} config:${JSON.stringify(scheduleEvent.schedule)}`,
    );

    console.log("SENT CONTEXT", context);
    const remoteInstance = this.client.spawn<any>(kind, id);
    await remoteInstance.__INTERNAL__.sendEventToInstance({
      args,
      action,
      mode: "emit",
      context,
    });
  }

  private async tryInstantiateInstance(
    config: ScheduleByType["instance"],
    context: ScheduleContext,
  ) {
    const Instance = this.instances[config.kind];
    if (!Instance) {
      throw new Error("Machine Not implemented");
    }

    try {
      const MIN_LOCK_DURATION = 2_000;
      const LOCK_ID = `redlock:${config.id}`;
      const lockConfig = {
        lockId: LOCK_ID,
        duration: MIN_LOCK_DURATION,
      };

      // When instantiating a new instance, we should acquire a lock
      // So that only one worker in the cloud is instantiating the instance
      // This is to prevent from executing side effects twice and race conditions.
      const lock = new Lock(lockConfig, this.adapters.lock);
      const result = await lock.using(async (abortSignal) => {
        const instance = new Instance();
        const data = this.getData(config.id);
        const manager = new InstanceProxy(
          instance,
          config,
          this.adapters,
          abortSignal,
          data,
          context,
        );

        await manager.run();
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
            config.id,
          );
          if (hasUnprocessedEvents) {
            this.adapters.scheduler.instance({
              kind: config.kind,
              id: config.id,
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

  static from<O extends SpawnkitConfig>(opts: O) {
    Worker.verify(opts.instances);

    if (process.env.NODE_ENV !== "test") {
      Object.keys(opts.instances).forEach((kind) => {
        console.log(`SpawnKit: ready to handle "${kind}" instances`);
      });
    }

    return new Worker<O>(opts);
  }

  static verify(instances: SpawnkitConfig["instances"]) {
    if (Object.keys(instances).length === 0) {
      throw new Error(`Validation Error: worker configured with 0 instances`);
    }
  }
}
