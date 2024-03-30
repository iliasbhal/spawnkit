import * as Spawnkit from "../src";

import { adapters } from "./redis";
import * as instances from "./instances";
const worker = Spawnkit.Worker.listen({
  adapters,
  instances,
});

// import type * as instances from "./instances";
const client = Spawnkit.Client.from({
  adapters,
  instances: {} as typeof instances,
});

const main = async () => {
  // client.on("");

  {
    const gameSession = client.actor("GameSession", 123213);
    await gameSession.jump();
    await gameSession.move(10, 100);
    await gameSession.just.move(10, 100);

    gameSession.on("round", (event) => {});
  }

  {
    const orderBook = client.actor("OrderBook", 123213);
    const aa = orderBook.buy({ tick: "asd" });
    const bb = orderBook.just.buy({ tick: "asd" });
    orderBook.on("change", (event) => {
      console.log(event);
    });
  }

  {
    const liveDoc = client.actor("LiveDocument", 123123);
    liveDoc.update({ changes: {} });
  }

  {
    const toggleMachine = client.actor("ToggleMachine", 123213);
    toggleMachine.send({ type: "TOGGLE" });
    toggleMachine.send({ type: "TOGGLE" });
  }

  {
    const LiveDocument = client.for("LiveDocument");
    const liveDoc = new LiveDocument(123213);
    liveDoc.update({ changes: [] });
  }
};
