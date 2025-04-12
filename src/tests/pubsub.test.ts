import * as Spawnkit from "../../src";
import { waitFor } from "poll-until-promise";
import { testRedisAdapters } from "./_utils";
import { wait } from "@/utils/wait";

describe("PubSub", () => {

  interface Channels {
    enterChat: { userId: string; }
  }

  interface Context {
    userID: string;
  }

  class PubSubExample extends Spawnkit.Instance<Context, Channels> {
    on<C extends keyof Channels>(channel: C, message: Channels[C]) {
      // console.log("ON INSTANCE", this.id, channel, message);
    }

    enterChat() {
      this.emit("enterChat", {
        userId: this.context.userID,
      });
    }

  }

  const client = Spawnkit.Client.from({
    adapter: testRedisAdapters,
    instances: {
      PubSubExample,
    },
  });

  client.start();

  it("can emit and listen to instance channels", async () => {
    const instance = client.spawn("PubSubExample", "test", {
      userID: "test-user-id",
    });

    const callback = jest.fn();
    instance.on("enterChat", callback);

    instance.enterChat();

    await waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "test-user-id" })
      );
    }, {
      interval: 10,
    });

    instance.dispose();

  });

  it("when subscribing to channel, it should not replay past events", async () => {
    const instance = client.spawn("PubSubExample", "test-2", {
      userID: "test-user-id",
    });

    const callback = jest.fn();

    await instance.enterChat();

    await wait(300);

    instance.on("enterChat", callback);

    await waitFor(() => {
      expect(callback).not.toHaveBeenCalled();
    }, {
      interval: 10,
    });

    instance.enterChat();

    await waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    }, {
      interval: 10,
    });

    instance.dispose();
  });

  it("should broadcast events to all instances", async () => {
    const instance = client.spawn("PubSubExample", "test-3", {
      userID: "test-user-id",
    });

    const instance2 = client.spawn("PubSubExample", "test-3", {
      userID: "test-user-id-2",
    });

    const callback = jest.fn();
    const callback2 = jest.fn();
    instance.on("enterChat", callback);
    instance2.on("enterChat", callback2);

    await instance.enterChat();

    await waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "test-user-id" })
      );

      expect(callback2).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "test-user-id" })
      );
    }, {
      interval: 10,
    });

    instance.dispose();
  });

  it("when disposing instance, it should react to emitted events", async () => {
    const instance = client.spawn("PubSubExample", "test-4", {
      userID: "test-user-id",
    });

    const instance2 = client.spawn("PubSubExample", "test-4", {
      userID: "test-user-id-2",
    });

    const callback = jest.fn();
    const callback2 = jest.fn();
    instance.on("enterChat", callback);
    instance2.on("enterChat", callback2);

    await instance.enterChat();

    await waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    }, {
      interval: 10,
    });

    callback.mockClear();
    callback2.mockClear();

    instance2.dispose();
    await instance.enterChat();

    await waitFor(() => {
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);

      expect(callback2).not.toHaveBeenCalled();
    }, {
      interval: 10,
    });

    instance.dispose();
  });
});

