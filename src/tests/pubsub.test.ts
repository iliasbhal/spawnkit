import * as Spawnkit from "../../src";
import { waitFor } from "poll-until-promise";
import { baseRedisAdapters } from "../../src/adapters/redis/base";
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
    adapters: baseRedisAdapters,
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

  it("when subscrbing to channel, it should not replay past events", async () => {
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
});

