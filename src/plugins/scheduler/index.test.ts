import * as Spawnkit from "../../../src";
import { nanoid } from 'nanoid';

describe('SchedulerExample', () => {
  const pingSpy = jest.fn();
  class SchedulerExample extends Spawnkit.Instance<{}, {}> {
    schedule = new Spawnkit.Plugins.Scheduler<SchedulerExample>();

    async schedulePing(arg: any) {
      this.schedule.delay(300).ping(arg);
    }

    ping(arg: any) {
      pingSpy(arg)
    }
  }

  const client = Spawnkit.Client.from({
    adapter: new Spawnkit.Adapters.InMemoryAdapter(),
    instances: {
      SchedulerExample,
    },
  });

  client.start();

  it('should be able to schedule a delay job', async () => {
    const remoteSqlite = client.spawn('SchedulerExample', `test-${nanoid()}`);

    await remoteSqlite.schedulePing('test1');
    await remoteSqlite.schedulePing('test2');
    await remoteSqlite.schedulePing('test3');

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(pingSpy).toHaveBeenCalledTimes(3);
    expect(pingSpy).toHaveBeenCalledWith('test1');
    expect(pingSpy).toHaveBeenCalledWith('test2');
    expect(pingSpy).toHaveBeenCalledWith('test3');

    await remoteSqlite.scheduled.cancel('test1');
  });

});