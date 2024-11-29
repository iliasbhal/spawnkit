import { Instance } from '../core/Instance';

export class InstancePlugin {
  instance: Instance<any, any, any>

  constructor() { }

  setup() { }

  inject(instance: Instance<any, any, any>) {
    this.instance = instance
  }
}