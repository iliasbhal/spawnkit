import wait from "wait";
import { Lock } from "./Lock";
import {
  ScheduleByType,
  ScheduleContext,
  ScheduleEventConfig,
  ScheduleInstanceData,
} from "../adapters";
import { Client, SpawnkitConfig } from "./Client";
import { InstanceProxy } from "./InstanceProxy";
import { Data } from "./Data";
import { Logger } from "./Logger";

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
            data as ScheduleEventConfig,
            context,
          );
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
      mode: "skip",
      context,
    });
  }

  private async tryInstantiateInstance(
    instanceConfig: ScheduleByType["instance"],
  ) {
    const Instance = this.instances[instanceConfig.kind];
    if (!Instance) {
      throw new Error("Machine Not implemented");
    }

    try {
      const MIN_LOCK_DURATION = 2_000;
      const RESOURCE_ID = `${instanceConfig.kind}:${instanceConfig.id}`;

      // When instantiating a new instance, we should acquire a lock
      // So that only one worker in the cloud is instantiating the instance
      // This is to prevent from executing side effects twice and race conditions.
      const executionId = crypto.randomUUID();
      const logger = new Logger({
        adapters: this.adapters,
        groupId: executionId,
        instance: instanceConfig,
      });

      const lock = new Lock({
        lockId: executionId,
        logger,
        adapters: this.adapters,
        resource: RESOURCE_ID,
        duration: MIN_LOCK_DURATION,
        instance: instanceConfig,
      });

      const data = new Data<any>({
        adapters: this.adapters,
        logger,
        instance: instanceConfig,
      });

      const result = await lock.using(async (abortSignal) => {
        const instance = new Instance();
        const proxy = new InstanceProxy(
          logger,
          instance,
          instanceConfig,
          this.adapters,
          abortSignal,
          data,
        );

        await proxy.start();
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
            this.adapters.scheduler.instance(instanceConfig);
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
