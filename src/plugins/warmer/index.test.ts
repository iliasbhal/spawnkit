import * as Spawnkit from "../..";
import { Warmer } from "./";
import { nanoid } from 'nanoid';

describe('WarmerExample', () => {
  class WarmerExample extends Spawnkit.Instance {
    warmer = new Warmer({
      // every 30 minutes, keep alive for 45 minutes
      // which means it will stay alive forever
      cron: '*/30 * * * *',
      stayAliveFor: 1000 * 60 * 45,
    });

    initialize(): void {
      this.warmer.setConfig({
        cron: '*/30 * * * *',
        stayAliveFor: 1000 * 60 * 45,
      });
    }
  }

  const client = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.InMemoryAdapter(),
    instances: {
      WarmerExample,
    },
  });

  client.start();

  it('should be able to ensure that an instance is kept alive', async () => {
    const remoteSqlite = client.spawn('WarmerExample', `test-${nanoid()}`);
  });

});