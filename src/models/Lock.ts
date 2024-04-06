import wait from "wait";
import { AdapterLock } from "../adapters";
import { ControlledPromise } from "@/utils/ControlledPromise";

export class LockError extends Error {}

export class AcquireLockError extends LockError {
  constructor(lockId: string) {
    super(`Couldn\'t acquire lock (${lockId})`);
  }
}

export class LockReleaseError extends LockError {
  constructor(lockId: string) {
    super(`Couldn\'t release lock (${lockId})`);
  }
}

export class LockExtendError extends LockError {
  constructor(lockId: string) {
    super(`Couldn\'t extend lock (${lockId})`);
  }
}

interface InstanceLockConfigInput {
  lockId: string;
  duration: number;
  extendBeforeThreshold?: number;
}

interface InstanceLockConfig {
  lockId: string;
  duration: number;
  extendBeforeThreshold: number;
}

export class Lock {
  static AcquireLockError = AcquireLockError;
  static ExtendError = LockExtendError;
  static ReleaseError = LockReleaseError;

  config: InstanceLockConfig;
  lock: AdapterLock;
  ownerId: string;

  getConfig(input: InstanceLockConfigInput): InstanceLockConfig {
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

  constructor(config: InstanceLockConfigInput, adapterLock: AdapterLock) {
    this.config = this.getConfig(config);
    this.ownerId = crypto.randomUUID();
    this.lock = adapterLock;
  }

  async acquire() {
    const { lockId, duration } = this.config;

    const acquired = await this.lock.acquire(lockId, this.ownerId, duration);
    if (!acquired) throw new AcquireLockError(lockId);
    return acquired;
  }

  async extend() {
    const { lockId, duration } = this.config;
    const extended = await this.lock.extend(lockId, this.ownerId, duration);
    if (!extended) throw new LockExtendError(lockId);
  }

  async release() {
    const { lockId } = this.config;
    const released = await this.lock.release(lockId, this.ownerId);
    if (!released) throw new LockReleaseError(lockId);
  }

  autoExtendLockInBackground(stopExtendingSignal: AbortSignal) {
    const extendAbortCtl = new AbortController();

    Promise.resolve()
      .then(async () => {
        const { extendBeforeThreshold } = this.config;
        let expireAt = Date.now();

        loop: while (true) {
          const timeBeforeExpire = expireAt - Date.now();
          const timeBeforeExtend = timeBeforeExpire - extendBeforeThreshold;

          if (stopExtendingSignal.aborted) break loop;
          await wait(timeBeforeExtend);

          if (stopExtendingSignal.aborted) break loop;
          expireAt = Date.now();
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

      return result as Awaited<typeof routinePromise>;
    } finally {
      routineAbortCtl.abort();
      await this.release();
    }
  }
}
