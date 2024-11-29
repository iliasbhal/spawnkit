import { Data } from "./Data";
import { BaseRemoteEntity, Instance } from "./Instance";

export interface InternalInstanceData {
  last_initialized: number;
  is_locked: boolean;
  conccurency: number;
}

export const DATA_UTILS_NAMESPACE = '__INTERNAL__UTILS__';

/** These methods can be called from client */
export class InstanceUtils<Inst extends Instance> extends BaseRemoteEntity<Inst> {
  private __types = {} as Inst['__types'];
  private utilsData: Data<InternalInstanceData>;

  constructor(data: Data<any>) {
    super();

    this.utilsData = data.withNamespace(DATA_UTILS_NAMESPACE);
  }

  async ping() {
    return 'pong';
  }

  async getLocalTimeUnix() {
    return Date.now();
  }


  async exists() {
    const exists = await this.utilsData.get('last_initialized');
    return !!exists;
  }

  async setLastInitialized(timestamp: number) {
    return await this.utilsData.set('last_initialized', timestamp);
  }

  concurrency = {
    get: async () => {
      const conccurency = await this.utilsData.get('conccurency');
      return conccurency;
    },

    set: async (conccurency: number) => {
      if (conccurency < 1) {
        throw new Error('Concurrency should be greater than 0');
      }

      return await this.utilsData.set('conccurency', conccurency);
    }
  }

  lock = {
    lock: async () => {
      return this.utilsData.set('is_locked', true);
    },
    unlock: async () => {
      return this.utilsData.set('is_locked', false);
    },
    check: async () => {
      return this.utilsData.get('is_locked');
    },
  }



}

