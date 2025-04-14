import { waitFor } from "poll-until-promise";

export async function waitUntilOK(callback: Function) {
  await waitFor(callback, {
    interval: 10,
  });
}
