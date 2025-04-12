import * as Spawnkit from "..";
import { redis } from "./_utils";
import { v4 as uuidv4 } from 'uuid';

export class BaseExample extends Spawnkit.Instance {
  hello() {
    return 'world';
  }
}

describe("Client", () => {
  const client = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.RedisAdapter(redis),
    instances: {
      BaseExample,
    },
  });

  const client2 = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.RedisAdapter(redis),
    instances: {
      BaseExample,
    },
  });

  client.start();

  it("client can be used without starting the worker", async () => {
    const inst = client2.spawn("BaseExample", uuidv4());
    const response = await inst.hello();
    expect(response).toBe('world');
  });

});