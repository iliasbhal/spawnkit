import * as Spawnkit from "../..";
import { nanoid } from 'nanoid';

describe('ClientExample', () => {

  const instId1 = nanoid();
  const instId2 = nanoid();

  class ClientExample extends Spawnkit.Instance {
    client = new Spawnkit.Plugins.Client<typeof instances>();

    sendMessageToAnotherInstance() {

      // console.log('this.client', this.client.spawn)
      const another = this.client.spawn('PingPong', instId2)

      return another.ping()
    }
  }

  class PingPong extends Spawnkit.Instance {
    ping() {
      return `pong-${this.id}` as const
    }
  }

  const instances = {
    ClientExample,
    PingPong,
  };

  const client = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.InMemoryAdapter(),
    instances: instances,
  });

  client.start();

  it('can call another instance from within a method call', async () => {
    const inst = client.spawn('ClientExample', instId1);
    const result = await inst.sendMessageToAnotherInstance()
    expect(result).toBe(`pong-${instId2}`)
  });

});