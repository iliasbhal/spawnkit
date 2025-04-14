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

  static findPlugins(instance: Instance): InstancePlugin[] {
    const plugins = []

    const recursiveFindPlugins = (root: any) => {
      return Object.keys(root).flatMap(key => {
        const plugin = root[key];
        const isPlugin = plugin instanceof InstancePlugin;
        if (!isPlugin) return [];

        InstancePlugin.ensurePluginSetup(plugin, instance);

        recursiveFindPlugins(plugin);
        plugins.push(plugin);
        return
      })
    }

    recursiveFindPlugins(instance);
    return plugins;

  }

  static ensurePluginSetup(plugin: InstancePlugin, instance: Instance) {
    if (plugin.instance) return;

    plugin.inject(instance);
    plugin.setup();
  }


  inject(instance: Instance) {
    this.instance = instance
  }
}