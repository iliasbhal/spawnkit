import * as Spawnkit from "@/.";

class SomeSpetialError extends Error {
  lol = "AAAAAAAA";
}

export class ErrorExample extends Spawnkit.Instance {
  doSomething(msg: string) {
    throw new SomeSpetialError("BAD BAD");
    return "DONE";
  }
}
