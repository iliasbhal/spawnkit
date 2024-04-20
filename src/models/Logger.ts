import {
  Adapters,
  InstanceId,
  InstanceKind,
  InstanceSignal,
} from "../adapters";

export class Logger {
  adapters: Adapters;
  groupId!: string;
  instance!: {
    id: InstanceId;
    kind: InstanceKind;
  };

  constructor(config: {
    adapters: Adapters;
    groupId: string;
    instance: {
      id: InstanceId;
      kind: InstanceKind;
    };
  }) {
    this.adapters = config.adapters;
    this.instance = config.instance;
    this.groupId = config.groupId;
  }

  log(signal: InstanceSignal) {
    this.adapters.logger?.log(
      this.instance.kind,
      this.instance.id,
      this.groupId,
      signal,
    );
  }
}
