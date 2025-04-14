import * as Spawnkit from "..";
import { nanoid } from 'nanoid';

export class BaseExample extends Spawnkit.Instance {
  hello() {
    return 'world';
  }
}

describe("Client", () => {
  const adapter = new Spawnkit.Adapters.InMemoryAdapter();

  const client = Spawnkit.Client.from({
    adapter,
    instances: {
      BaseExample,
    },
  });

  const client2 = Spawnkit.Client.from({
    adapter,
    instances: {
      BaseExample,
    },
  });

  client.start();

  it("client can be used without starting the worker", async () => {
    const inst = client2.spawn("BaseExample", nanoid());
    const response = await inst.hello();
    expect(response).toBe('world');
  });

});