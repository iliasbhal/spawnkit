import * as Spawnkit from "../../../src";
import { Scheduler } from ".";
import { nanoid } from 'nanoid';

describe('SchedulerExample', () => {
  const scheduledActionSpy = jest.fn();
  class SchedulerExample extends Spawnkit.Instance {
    schedule = new Scheduler<SchedulerExample>();

    async scheduleTask(arg: any) {
      this.schedule.delay(300).ping(arg);
    }

    ping(arg: any) {
      scheduledActionSpy(arg)
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

    await remoteSqlite.scheduleTask('test1');
    await remoteSqlite.scheduleTask('test2');
    await remoteSqlite.scheduleTask('test3');

    await new Promise(resolve => setTimeout(resolve, 400));

    expect(scheduledActionSpy).toHaveBeenCalledTimes(3);
    expect(scheduledActionSpy).toHaveBeenCalledWith('test1');
    expect(scheduledActionSpy).toHaveBeenCalledWith('test2');
    expect(scheduledActionSpy).toHaveBeenCalledWith('test3');

    await remoteSqlite.scheduled.cancel('test1');
  });

});