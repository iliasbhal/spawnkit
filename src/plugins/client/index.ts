import { InstancePlugin } from "../InstancePlugin";
import { Client as ClientCore, Instances } from "../../core/Client";

export class Client<C extends Instances> extends InstancePlugin {
  get client() {
    return this.instance.api.client as ClientCore<{
      adapter: any,
      instances: C
    }>
  }

  setup(): void {
    this.instance.hooks.dispose.push(() => {
      this.client.stop();
    })
  }

  get spawn() {
    return this.client.spawn.bind(this.client);
  }
}

