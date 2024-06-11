import { wait } from "../utils/wait";
import { Adapters, InstanceId, InstanceKind } from "../adapters";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { Logger } from "./Logger";

export class LockError extends Error { }

export class AcquireLockError extends LockError {
  constructor(resource: string, lockId: string) {
    super(`Couldn\'t acquire lock (${resource} | ${lockId})`);
  }
}

export class LockReleaseError extends LockError {
  constructor(resource: string, lockId: string) {
    super(`Couldn\'t release lock (${resource} | ${lockId})`);
  }
}

export class LockExtendError extends LockError {
  constructor(resource: string, lockId: string) {
    super(`Couldn\'t extend lock (${resource} | ${lockId})`);
  }
}

interface LockConfig {
  resource: string;
  duration: number;
  extendBeforeThreshold?: number;
  instance: {
    kind: InstanceKind;
    id: InstanceId;
  };
}

interface InstanceLockConfig {
  resource: string;
  duration: number;
  extendBeforeThreshold: number;
}

export class Lock {
  static AcquireLockError = AcquireLockError;
  static ExtendError = LockExtendError;
  static ReleaseError = LockReleaseError;

  config: InstanceLockConfig;
  adapters: Adapters;
  logger: Logger;
  lockId: string;
  expireAt: number = 0;

  getConfig(input: LockConfig): InstanceLockConfig {
    const config = input;

    if (Math.floor(config.duration) !== config.duration) {
      throw new Error("Duration must be an integer value in milliseconds.");
    }

    const extendBeforeThreshold =
      config.extendBeforeThreshold || config.duration / 2;
    const isValidExtension = extendBeforeThreshold > config.duration - 100;
    if (isValidExtension) {
      throw new Error(
        "A lock `duration` must be at least 100ms greater than the `extendBeforeThreshold` setting.",
      );
    }

    return Object.assign({}, config, {
      extendBeforeThreshold,
    });
  }

  constructor(
    config: LockConfig & { adapters: Adapters; lockId: string; logger: Logger },
  ) {
    this.config = this.getConfig(config);
    this.lockId = config.lockId;
    this.adapters = config.adapters;
    this.logger = config.logger;
  }

  async acquire() {
    const { resource, duration } = this.config;

    const expireAt = Date.now() + duration;

    this.logger.log({
      type: "lock:acquire",
      duration: duration,
    });

    const acquired = await this.adapters.lock.acquire(
      resource,
      this.lockId,
      duration,
    );

    if (!acquired) throw new AcquireLockError(resource, this.lockId);

    this.expireAt = expireAt;
    return acquired;
  }

  async extend() {
    const { resource, duration } = this.config;
    const expireAt = Date.now() + duration;

    this.logger.log({
      type: "lock:extend",
      duration: duration,
    });

    const extended = await this.adapters.lock.extend(
      resource,
      this.lockId,
      duration,
    );
    if (!extended) throw new LockExtendError(resource, this.lockId);

    this.expireAt = expireAt;
  }

  async release() {
    const { resource } = this.config;

    this.logger.log({
      type: "lock:release",
    });

    const released = await this.adapters.lock.release(resource, this.lockId);
    if (!released) throw new LockReleaseError(resource, this.lockId);

    this.expireAt = 0;
  }

  autoExtendLockInBackground(stopExtendingSignal: AbortSignal) {
    const extendAbortCtl = new AbortController();
    extendAbortCtl.signal.addEventListener("abort", () => {
      this.logger.log({
        type: "lock:abort",
      });
    });

    Promise.resolve()
      .then(async () => {
        const { extendBeforeThreshold } = this.config;

        loop: while (true) {
          const timeBeforeExpire = this.expireAt - Date.now();
          const timeBeforeExtend = timeBeforeExpire - extendBeforeThreshold;
          if (stopExtendingSignal.aborted) break loop;
          await wait(timeBeforeExtend);

          if (stopExtendingSignal.aborted) break loop;
          await this.extend();
        }
      })
      .catch((err) => {
        // If an error happens after the routine has completed,
        // we can safely ignore, otherwise, we throw the error;
        if (stopExtendingSignal.aborted) return;
        extendAbortCtl.abort(err);
        throw err;
      });

    return extendAbortCtl.signal;
  }

  async using<T>(routine: (singal: AbortSignal) => Promise<T>) {
    await this.acquire();

    // If we are not able to acquire the lock in the first place
    // there is not point in going through all the code below.
    const routineAbortCtl = new AbortController();
    const abortExtSignal = this.autoExtendLockInBackground(
      routineAbortCtl.signal,
    );

    try {
      const routinePromise = routine(abortExtSignal);
      const result = await Promise.race([
        ControlledPromise.wrapSignal(abortExtSignal), // <-- this never resolves, it only throws
        routinePromise,
      ]);

      routineAbortCtl.abort();

      return result as Awaited<typeof routinePromise>;
    } finally {
      this.release().catch((err) => {
        const routineCompleted = routineAbortCtl.signal.aborted;
        if (!routineCompleted) {
          throw err;
        }
      });
    }
  }
}
