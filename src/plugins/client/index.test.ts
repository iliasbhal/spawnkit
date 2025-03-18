import * as Spawnkit from "../..";
import { Client } from ".";
import { baseRedisAdapters } from "../../adapters/redis/base";
import { nanoid } from 'nanoid';

describe('ClientExample', () => {
  class ClientExample extends Spawnkit.Instance {
    client = new Client<typeof instances>();

    sendMessageToAnotherInstance() {
      const another = this.client.spawn('PingPong', `test-${nanoid()}`)

      return another.ping()
    }
  }

  class PingPong extends Spawnkit.Instance {
    ping() {
      return 'pong' as const
    }
  }

  const instances = {
    ClientExample,
    PingPong,
  };

  const client = Spawnkit.Client.from({
    adapters: baseRedisAdapters,
    instances: instances,
  });

  client.start();

  it('should be able to schedule a delay job', async () => {
    const remoteSqlite = client.spawn('ClientExample', `test-${nanoid()}`);
    const result = await remoteSqlite.sendMessageToAnotherInstance()
    expect(result).toBe('pong')
  });

});