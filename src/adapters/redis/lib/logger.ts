import SuperJSON from "superjson";
import * as Adapters from "../../index";
import { RedisAdapter } from "./_base";

/**
 * This class is used for internaltools
 * Using the data in stored with it, we'll be able to build tools
 * to debug and trace back what happens
 * TODO: also output files ( easier to debug with );
 */
export class Logger extends RedisAdapter implements Adapters.AdapterLogger {
  async log(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    groupId: string,
    signal: Adapters.InstanceSignal,
  ) {
    const now = Date.now();
    const serialized = SuperJSON.stringify({
      ...signal,
      timestamp: now,
    });

    await Promise.all([
      this.redis.zadd(`spawnkit:logs:${kind}:${id}:index`, now, groupId),
      this.redis.lpush(
        `spawnkit:logs:${kind}:${id}:logs:${groupId}`,
        serialized,
      ),
    ]);
  }

  /** list log groups for this instance */
  async list(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    range: { from: number; to: number } = {
      from: 0,
      to: -1 /* -1 = until the last element */,
    },
  ): Promise<string[]> {
    return await this.redis.zrange(
      `spawnkit:logs:${kind}:${id}:index`,
      range.from,
      range.to,
      "REV",
    );
  }

  /* retieve all the logs from a log group */
  async get(
    kind: Adapters.InstanceKind,
    id: Adapters.InstanceId,
    groupId: string,
  ): Promise<Adapters.InstanceSignal[]> {
    const rawLogs = await this.redis.lrange(
      `spawnkit:logs:${kind}:${id}:logs:${groupId}`,
      0,
      -1,
    );
    const logs = rawLogs.map((raw) =>
      SuperJSON.parse<Adapters.InstanceSignal>(raw),
    );
    return logs;
  }

  async delete(
    kind: string,
    id: string,
    range: { from: number; to: number },
  ): Promise<any> {
    // TODO: add ability to delete logs
  }
}
