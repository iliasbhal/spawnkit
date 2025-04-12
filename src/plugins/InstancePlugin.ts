import { Instance } from '../core/Instance';

export class InstancePlugin {
  instance: Instance

  constructor() { }

  hooks: {
    initialize: (() => Promise<void>)[]
    dispose: (() => Promise<void>)[]
  } = {
      initialize: [],
      dispose: [],
    }

  setup() { }

  static findPlugins(): InstancePlugin[] {
    return [];
    const instance = this as any as Instance;
    const recursiveFindPlugins = (root: any, acc: InstancePlugin[] = []) => {
      return Object.keys(root).flatMap(key => {
        const plugin = root[key];
        const isPlugin = plugin instanceof InstancePlugin;
        if (!isPlugin) return [];

        const isSetup = !!plugin.instance;
        if (!isSetup) {
          plugin.inject(instance);
          plugin.setup();
        }

        acc.push(plugin);
        return recursiveFindPlugins(plugin, acc);
      })
    }

    return recursiveFindPlugins(this);
  }


  inject(instance: Instance) {
    this.instance = instance
  }
}