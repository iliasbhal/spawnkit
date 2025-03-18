import * as Spawnkit from "../..";
import { KV } from ".";
import { baseRedisAdapters } from "../../adapters/redis/base";

export class KVExample extends Spawnkit.Instance {
  kv = new KV({ name: 'test' });

  async addScore(id: string, score: number) {
    await this.kv.zadd(id, score);
  }

  async getScores(id: string) {
    return this.kv.zrange(id, 0, -1);
  }
}

const client = Spawnkit.Client.from({
  adapters: baseRedisAdapters,
  instances: {
    KVExample,
  },
});

describe('KVExample', () => {
  client.start();

  it('should be able to download and upload', async () => {
    const remoteSqlite = client.spawn('KVExample', 'test');

    try {
      await remoteSqlite.addScore('user1', 100);
    } catch (error) {
      console.error('error', error);
    }

  });
});