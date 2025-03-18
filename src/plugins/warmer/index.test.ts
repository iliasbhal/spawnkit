import * as Spawnkit from "../..";
import { Warmer } from "./";
import { baseRedisAdapters } from "../../adapters/redis/base";
import { nanoid } from 'nanoid';

describe('WarmerExample', () => {
  class WarmerExample extends Spawnkit.Instance {
    warmer = new Warmer();
  }

  const client = Spawnkit.Client.from({
    adapters: baseRedisAdapters,
    instances: {
      WarmerExample,
    },
  });

  client.start();

  it('should be able to schedule a delay job', async () => {
    const remoteSqlite = client.spawn('WarmerExample', `test-${nanoid()}`);
  });

});