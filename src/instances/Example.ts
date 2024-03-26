import * as Spawnkit from "..";

interface ActorData {}

interface ActorEvent {}

export class Example extends Spawnkit.Instance<ActorData, ActorEvent> {
  async stop() {
    console.log("STOPED");
  }

  async onEvent(event: ActorEvent) {
    console.log("RECEIVED EVENT", event);
  }

  async start() {
    console.log("STARTED");
  }
}
