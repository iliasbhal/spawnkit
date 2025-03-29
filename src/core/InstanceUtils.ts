import { InstanceProxy } from "./InstanceProxy";
import { Instance } from "./Instance";

export interface InternalInstanceData {
  last_initialized: number;
  is_locked: boolean;
  conccurency: number;
}

// export const DATA_UTILS_NAMESPACE = '__INTERNAL__UTILS__';

/** These methods can be called from client */
export class InstanceUtils<Proxy extends InstanceProxy<any>> {
  private proxy: Proxy;

  constructor(proxy: Proxy) {
    this.proxy = proxy;
  }

  async ping() {
    return 'pong';
  }

  async stayLiveFor(waitMs: number) {
    this.proxy.keepAlive.addWait(waitMs);
  }

  async getLocalTimeUnix() {
    return Date.now();
  }

  async exists() {
    const exists = await this.proxy.data.get('last_initialized');
    return !!exists;
  }

  async setLastInitialized(timestamp: number) {
    return await this.proxy.data.set('last_initialized', timestamp);
  }

  static ensureInstanceIsValid(instance: Instance) {
    const baseInst = new Instance();

    console.log('Object.keys(baseInst)', Object.keys(baseInst));
    Object.keys(baseInst).forEach(key => {

    })
    // const clientInst = this.spawn('TEST_INST' as any, "__TEST_ID__", {});
    // clientInst.dispose();

    // Object.values(this.instances).forEach((InstanceClass: any) => {
    // 	const inst = new InstanceClass();
    // 	const instanceName = InstanceClass.name;


    // 	const clientKeys = new Set(Object.keys(clientInst));
    // 	const instanceKeys = new Set(
    // 		Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).concat(Object.keys(inst)),
    // 	);

    // 	const instanceProtoKeys = new Set(
    // 		Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(inst))),
    // 	);

    // 	const intersect = new Set([...Array.from(clientKeys)].filter((i) => instanceKeys.has(i)));
    // 	const cannotUseKeys = new Set(
    // 		[...Array.from(intersect)].filter((i) => !instanceProtoKeys.has(i)),
    // 	);

    // 	if (cannotUseKeys.size > 0) {
    // 		throw new Error(
    // 			`Cannot use reserved keys: ${Array.from(cannotUseKeys).join(", ")} in instance ${instanceName}`,
    // 		);
    // 	}
    // });
  }
}

