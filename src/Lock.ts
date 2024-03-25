import wait from "wait";
import { AdapterLock } from "./adapters";

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
  static ReleaseError = LockReleaseError;
  static ExtendError = LockExtendError;

  config: InstanceLockConfig;
  adapterLock: AdapterLock;

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
    this.adapterLock = adapterLock;
  }

  async acquire() {
    const { lockId, duration } = this.config;
    await this.adapterLock.acquire(lockId, duration);
  }

  async extend() {
    const { lockId, duration } = this.config;
    await this.adapterLock.extend(lockId, duration);
  }

  async release() {
    const { lockId } = this.config;
    await this.adapterLock.release(lockId);
  }

  async using<T>(routine: (singal: AbortSignal) => Promise<T>) {
    await this.acquire();
    let expireAt = Date.now();

    // If we are not able to acquire the lock in the first place
    // there is not point in going through all the code below.

    const routineAbortCtl = new AbortController();
    const extendAbortCtl = new AbortController();

    const autoExtendBackground = Promise.resolve()
      .then(async () => {
        const { extendBeforeThreshold } = this.config;
        loop: while (true) {
          const timeBeforeExpire = expireAt - Date.now();
          const timeBeforeExtend = timeBeforeExpire - extendBeforeThreshold;

          if (routineAbortCtl.signal.aborted) break loop;
          await wait(timeBeforeExtend);

          if (routineAbortCtl.signal.aborted) break loop;
          await this.extend();
          expireAt = Date.now();
        }
      })
      .catch((err) => {
        // If an error happens after the routine has completed,
        // we can safely ignore, otherwise, we throw the error;
        if (routineAbortCtl.signal.aborted) return;
        extendAbortCtl.abort(err);
        throw err;
      });

    try {
      const result = await routine(extendAbortCtl.signal);
      return result;
    } finally {
      routineAbortCtl.abort();
      await this.release();
    }
  }
}
