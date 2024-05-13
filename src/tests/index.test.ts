import * as Spawnkit from "../";
import wait from "wait";

describe("Spawnkit", () => {
  describe("Base", () => {
    it("client can use instance methods", () => {});
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
    it.todo("can subscribe to data changes via .data.on('key', subscriber)");
  });

  describe("Stream", () => {
    it.todo("forwards returned stream to client (.map)");
    it.todo("forwards returned stream to client (async iterator)");
    it.todo("should replay messages in the same order they have been emitted");
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
    it.todo("when subscrbing to channel, it should not replay past events");
  });
});
