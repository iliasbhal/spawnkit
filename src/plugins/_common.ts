import { Instance } from '../core/Instance';

export class InstancePlugin {
  instance: Instance

  constructor() { }

  setup() { }

  inject(instance: Instance) {
    this.instance = instance
  }
}