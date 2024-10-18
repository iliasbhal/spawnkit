import { BaseRemoteEntity } from "./Instance";
import type { InstanceProxy } from "./InstanceProxy";

/** These methods can be called from client */
export class InstanceUtils extends BaseRemoteEntity {
  proxy: InstanceProxy<any>;

  constructor(proxy: InstanceProxy<any>) {
    super();

    this.proxy = proxy;
  }

  async ping() {
    return 'pong';
  }

  async getLocalTimeUnix() {
    return Date.now();
  }
}