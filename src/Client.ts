import { Instance } from "./Instance";
import { Adapters } from "./adapters";

type InstanceClass = typeof Instance<any>;

interface ClientProps<T extends InstanceClass = InstanceClass> {
  instances: T[];
  adapters: Omit<Adapters, "lock" | "worker">;
}

export class Client {
  static from(opts: ClientProps) {
    return opts.adapters;
  }
}
