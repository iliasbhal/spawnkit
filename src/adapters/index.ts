export interface Adapters {
  lock: AdapterLock;
  events: AdapaterEvents;
  snapshot: AdapaterSnapshot;
  scheduler: AdapaterScheduler;
  worker: AdapaterWorker;
}

export abstract class AdapterLock {
  abstract acquire(lockId: string, duration: number): Promise<boolean>;
  abstract extend(lockId: string, duration: number): Promise<boolean>;
  abstract release(lockId: string): Promise<boolean>;
}

export abstract class AdapaterSnapshot {
  abstract get<Data>(actorId: number): Promise<Data | null>;

  abstract set<Data extends object>(
    actorId: number,
    snapshot: Data,
  ): Promise<true>;

  abstract subscribe<Data>(
    actorId: number,
    onSnapshot: (snapshot: Data) => void,
  ): { unsubscribe: Function };
}

export interface ScheduleData {
  kind: string;
  id: number;
  input?: any;
}

export abstract class AdapaterEvents {
  abstract publish(actorId: number, event: { type: string }): Promise<true>;
  abstract ack(actorId: number, eventId: number): Promise<true>;
  abstract has(actorId: number): Promise<boolean>;
  abstract subscribe<E extends { id: number; data: any }>(
    actorId: number,
    onEvent: (event: E) => void,
  ): { unsubscribe: Function };
}

export abstract class AdapaterScheduler {
  abstract schedule(schedule: ScheduleData): Promise<true>;
}

export abstract class AdapaterWorker {
  abstract subscribe(callback: (config: ScheduleData) => any): {
    unsubscribe: Function;
  };
}
