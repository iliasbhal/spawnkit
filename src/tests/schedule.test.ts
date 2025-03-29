import * as Spawnkit from "../";
import { wait } from "../utils/wait";
import { testRedisAdapters } from "./_utils";
import { v4 as uuidv4 } from 'uuid';

describe("Schedule", () => {
  const helloStub = jest.fn();
  const doSomethingStub = jest.fn();

  class ScheduleExample extends Spawnkit.Instance {
    hello() {
      helloStub();
      return "world";
    }

    doSomething(action: string) {
      doSomethingStub(action);
      return true;
    }

    stream() {
      return new Spawnkit.Stream<string>(async (stream) => {
        for (let i = 0; i < 3; i++) {
          await stream.emit(`hello-${i}`);
          await wait(100);
        }
      });
    }

    async createError(errorMessage: string) {
      await wait(100);
      throw new Error(errorMessage);
    }

  }

  const client = Spawnkit.Client.from({
    adapters: testRedisAdapters,
    instances: {
      ScheduleExample,
    },
  });

  client.start();

  beforeEach(() => {
    helloStub.mockClear();
    doSomethingStub.mockClear();
  });

  it("from client: can schedule method call (delay)", async () => {
    const inst = client.spawn("ScheduleExample", "1");
    const scheduleId = await inst.schedule({ delay: 300 }).hello();

    expect(helloStub).toHaveBeenCalledTimes(0);

    const runs = await inst.scheduled.runs(scheduleId)
    expect(runs).toHaveLength(0);

    expect(helloStub).toHaveBeenCalledTimes(0);

    await wait(1000);

    const runs2 = await inst.scheduled.runs(scheduleId)
    expect(runs2).toHaveLength(1);
    expect(helloStub).toHaveBeenCalledTimes(1);
  });

  it("from client: can cancel schedule method call (delay)", async () => {
    const inst = client.spawn("ScheduleExample", "1");
    const scheduleId = await inst.schedule({ delay: 300 }).hello()

    expect(helloStub).toHaveBeenCalledTimes(0);

    const runs = await inst.scheduled.runs(scheduleId)
    expect(runs).toHaveLength(0);

    expect(helloStub).toHaveBeenCalledTimes(0);

    await wait(100);

    await inst.scheduled.cancel(scheduleId);

    await wait(1000);

    expect(helloStub).toHaveBeenCalledTimes(0);
    const runs2 = await inst.scheduled.runs(scheduleId)
    expect(runs2).toHaveLength(0);
  });


  it.todo("from client: can schedule method call (cron)");
  it.todo("from client: can cancel schedule method call (cron)");

  it("from client: can list all scheduled method call", async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduleId = await inst.schedule({ delay: 300 }).hello()
    const scheduleId2 = await inst.schedule({ delay: 300 }).hello()
    const scheduleId3 = await inst.schedule({ delay: 300 }).hello()

    const scheduled = await inst.scheduled.list();
    expect(scheduled).toHaveLength(3);
    const scheduledIds = scheduled
      // .sort((a, b) => a.created_at - b.created_at)
      .map(s => s.scheduleId);

    expect(scheduledIds).toEqual([scheduleId, scheduleId2, scheduleId3]);

    await expect(inst.scheduled.runs(scheduledIds[0])).resolves.toHaveLength(0);
    await expect(inst.scheduled.runs(scheduledIds[1])).resolves.toHaveLength(0);
    await expect(inst.scheduled.runs(scheduledIds[2])).resolves.toHaveLength(0);

    await wait(400);


    await expect(inst.scheduled.runs(scheduledIds[0])).resolves.toHaveLength(1);
    await expect(inst.scheduled.runs(scheduledIds[1])).resolves.toHaveLength(1);
    await expect(inst.scheduled.runs(scheduledIds[2])).resolves.toHaveLength(1);
  });

  it('stores error in scheduled method call', async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduleId = await inst.schedule({ delay: 300 }).createError("test error")
    await expect(inst.scheduled.runs(scheduleId)).resolves.toHaveLength(0);

    await wait(600);

    const runData = await inst.scheduled.runs(scheduleId);
    expect(runData).toHaveLength(1);
    expect(runData[0].response.error).toMatchObject({
      message: "test error",
    });
  })

  it('stores response in scheduled method call', async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduleId = await inst.schedule({ delay: 300 }).hello()
    await expect(inst.scheduled.runs(scheduleId)).resolves.toHaveLength(0);

    await wait(400);

    const runData = await inst.scheduled.runs(scheduleId);
    expect(runData).toHaveLength(1);
    expect(runData[0].response.data).toBe("world");
  });

  it('stores streamed response in scheduled method call', async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduleId = await inst.schedule({ delay: 300 }).stream()
    await expect(inst.scheduled.runs(scheduleId)).resolves.toHaveLength(0);

    await wait(1000);

    const runData = await inst.scheduled.runs(scheduleId);

    expect(runData).toHaveLength(1);
    expect(runData[0].response.stream).toEqual(["hello-0", "hello-1", "hello-2"]);
  })

  it("can ensure that a scheduled method is only scheduled once", async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduleId = await inst.schedule({ id: 'test', delay: 300 }).doSomething('1');
    const scheduleId2 = await inst.schedule({ id: 'test', delay: 300 }).doSomething('1');

    expect(scheduleId).toEqual(scheduleId2);
    expect(scheduleId).toEqual('test');

    await wait(1000);

    const runData = await inst.scheduled.runs(scheduleId);
    expect(runData).toHaveLength(1);
  });

  it('can check if an event is scheduled', async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    const scheduled = await inst.scheduled.get('test');
    expect(scheduled).toBe(null);

    await inst.schedule({ id: 'test', delay: 300 }).hello();
    const scheduled2 = await inst.scheduled.get('test');
    expect(scheduled2).toMatchObject({});
  })

  it("should override scheduled event using same id but different config", async () => {
    const inst = client.spawn("ScheduleExample", uuidv4());
    await inst.schedule({ id: 'test', delay: 700 }).doSomething('1');
    const scheduled1 = await inst.scheduled.get('test');
    expect(scheduled1).toMatchObject({
      config: {
        event: {
          action: 'doSomething',
          args: ['1'],
        },
        schedule: {
          delay: 700,
          id: 'test',
        },
      },
    });

    await inst.schedule({ id: 'test', delay: 800 }).hello();
    const scheduled2 = await inst.scheduled.get('test');
    expect(scheduled2).toMatchObject({
      config: {
        event: {
          action: 'hello',
          args: [],
        },
        schedule: {
          delay: 800,
          id: 'test',
        },
      },
    });

    await wait(1000);
    expect(helloStub).toHaveBeenCalledTimes(1);
    expect(doSomethingStub).toHaveBeenCalledTimes(0);
  });
});