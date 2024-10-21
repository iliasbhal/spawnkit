import { Data } from "./Data";
import { BaseRemoteEntity, Instance } from "./Instance";
import type { InstanceProxy } from "./InstanceProxy";

export interface InternalInstanceData {
  last_initialized: number;
  conccurency: number;
}

export const DATA_UTILS_NAMESPACE = '__INTERNAL__UTILS__';

/** These methods can be called from client */
export class InstanceUtils<Inst extends Instance> extends BaseRemoteEntity<Inst> {
  __types = {} as Inst['__types'];

  proxy: InstanceProxy<Inst>;
  utilsData: Data<InternalInstanceData>;

  constructor(proxy: InstanceProxy<Inst>) {
    super();

    this.proxy = proxy;
    this.utilsData = proxy.data.withNamespace(DATA_UTILS_NAMESPACE);
  }

  async ping() {
    return 'pong';
  }

  async getLocalTimeUnix() {
    return Date.now();
  }

  async getConcurrency() {
    return await this.utilsData.get('conccurency');
  }

  async setConcurrency(conccurency: number) {
    return await this.utilsData.set('conccurency', conccurency);
  }

  async exists() {
    const exists = await this.utilsData.get('last_initialized');
    return !!exists;
  }

  async setLastInitialized(timestamp: number) {
    return await this.utilsData.set('last_initialized', timestamp);
  }
}

