import { Redis } from "ioredis";
import Redlock, { Settings as RedlockSettings } from "redlock";
import { redis } from "../../prisma";

// You should have one client for each independent redis node
// or cluster.
const redisCluster: Redis[] = [redis];
const getRedlockSettings = (lockDuration: number): RedlockSettings => ({
  // The expected clock drift; for more details see:
  // http://redis.io/topics/distlock
  driftFactor: 0.01, // multiplied by lock ttl to determine drift time

  // The max number of times Redlock will attempt to lock a resource
  // before erroring.
  retryCount: 0,
  retryDelay: 300, // the time in ms between attempts
  retryJitter: 2000, // the max time in ms randomly added to retries (// see https://www.awsarchitectureblog.com/2015/03/backoff.html)

  // The minimum remaining time on a lock before an extension is automatically
  // attempted with the `using` API.
  automaticExtensionThreshold: lockDuration / 2, // time in ms
});

export class DistributedLockError extends Error {
  constructor(lockKey: string) {
    super(`Couldn\'t acquire lock (${lockKey})`);
  }
}

export class DistributedLockExtendError extends Error {
  constructor(lockKey: string) {
    super(`Couldn\'t extend lock (${lockKey})`);
  }
}

export class InstanceLock {
  static LockError = DistributedLockError;
  static ExtendError = DistributedLockExtendError;
  static async aquireLockAndRun<
    C extends (signal: AbortSignal) => any,
  >(config: {
    lockKey: string;
    lockDuration: number;
    callback: C;
  }): Promise<ReturnType<C>> {
    const settings = getRedlockSettings(config.lockDuration);
    const redlock = new Redlock(redisCluster, settings);
    try {
      return await redlock.using(
        [config.lockKey],
        config.lockDuration,
        config.callback,
      );
    } catch (err: any) {
      if (err instanceof Error) {
        if (err.message.includes("was unable to achieve a quorum")) {
          throw new InstanceLock.LockError(config.lockKey);
        }
      }

      throw err;
    }
  }
}
