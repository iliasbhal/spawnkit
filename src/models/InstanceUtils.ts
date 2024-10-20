import { BaseRemoteEntity, Instance } from "./Instance";
import type { InstanceProxy } from "./InstanceProxy";

/** These methods can be called from client */
export class InstanceUtils<Inst extends Instance> extends BaseRemoteEntity<Inst> {
  __types = {} as Inst['__types'];

  proxy: InstanceProxy<Inst>;

  constructor(proxy: InstanceProxy<Inst>) {
    super();

    this.proxy = proxy;
  }

  async ping() {
    return 'pong';
  }

  async getLocalTimeUnix() {
    return Date.now();
  }

  async setData<Key extends keyof typeof this.__types['InstanceData']>(key: Key, value: typeof this.__types['InstanceData'][Key]) {
    return await this.proxy.data.set(key, value);
  }
}