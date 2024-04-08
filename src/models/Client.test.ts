import { Client } from "./Client";
import wait from "wait";

describe("Client", () => {
  describe("Base", () => {
    it.todo("client can use instance methods");
    it.todo("can call for instance method and not wait for the resonse");
  });

  describe("Errors", () => {
    it.todo("forwards message, stacktrace and other attributes");
    it.todo("forwards errors thrown during the method call (sync method)");
    it.todo("forwards errors thrown during the method call (async method)");
    it.todo("forwards error if happen during stream ( .map )");
    it.todo("forwards error if happen during stream ( for await )");
  });

  describe("Data", () => {
    it.todo("can use .data.get() remotely");
  });

  describe("Stream", () => {
    it.todo("forwards returned stream to client (.map)");
    it.todo("forwards returned stream to client (async iterator)");
  });

  describe("Schedule", () => {
    it.todo("can schedule method call (delay)");
    it.todo("can cancel schedule method call (delay)");
    it.todo("can schedule method call (cron)");
    it.todo("can cancel schedule method call (cron)");
    it.todo("can list all scheduled method call");
  });

  describe("PubSub", () => {
    it.todo("can emit and listen to instance channels");
  });

  describe("Internal", () => {
    it("should not try to schedule instance on every event", async () => {
      // I added a checkShouldScheduleWithEventSent function
      // But this need to unit tested.

      expect(checkShouldScheduleWithEventSent()).toBe(true);
      expect(checkShouldScheduleWithEventSent()).toBe(false);

      await wait(1000);

      expect(checkShouldScheduleWithEventSent()).toBe(true);
      expect(checkShouldScheduleWithEventSent()).toBe(false);

      throw new Error(
        "REPLACE THIS TEST WITH A CLIENT INSTEAD OF USING A COPY PASTED SNIPPER FROM CLIENT",
      );
    });
  });
});

let lastEventSentAt: number | null = null;
const checkShouldScheduleWithEventSent = () => {
  if (!lastEventSentAt) {
    lastEventSentAt = Date.now();
    return true;
  }

  const timeSinceLastEventSent = Date.now() - lastEventSentAt;
  const shouldScheduleInstance = timeSinceLastEventSent > 1000;
  lastEventSentAt = Date.now();
  return shouldScheduleInstance;
};
