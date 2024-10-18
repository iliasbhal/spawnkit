import type { InstanceProxy } from "./InstanceProxy";

/** These methods can be called from client */
export class InstanceUtils {
  proxy: InstanceProxy<any>;

  constructor(proxy: InstanceProxy<any>) {
    this.proxy = proxy;
  }

  async ping() {
    return 'pong';
  }
}