import * as Spawnkit from "@/.";
import wait from "wait";

describe("Client", () => {
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
