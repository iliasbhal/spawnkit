type EventId = number;
type ActorId = number;
type ActorKind = string;
type LockId = string;

export interface Adapters {
  lock: AdapterLock;
  events: AdapaterEvents;
  snapshot: AdapaterSnapshot;
  pubsub: AdapterPubSub;
  scheduler: AdapaterScheduler;
  worker: AdapaterWorker;
}

export abstract class AdapterLock {
  abstract acquire(lockId: LockId, duration: number): Promise<boolean>;
  abstract extend(lockId: LockId, duration: number): Promise<boolean>;
  abstract release(lockId: LockId): Promise<boolean>;
}

export abstract class AdapaterSnapshot {
  abstract get<Data>(actorId: ActorId): Promise<Data | null>;

  abstract set<Data>(actorId: ActorId, snapshot: Data): Promise<true>;

  abstract subscribe<Data>(
    actorId: ActorId,
    onSnapshot: (snapshot: Data) => void,
  ): { unsubscribe: Function };
}

export abstract class AdapterPubSub {
  abstract emit(channel: string, data: any): Promise<true>;
  abstract on(
    channel: string,
    callback: (data: any) => any,
  ): { unsubscribe: Function };
}

export abstract class AdapaterEvents {
  abstract publish<EventData>(
    actorId: ActorId,
    event: EventData,
  ): Promise<EventId>;

  abstract ack(actorId: ActorId, eventId: EventId): Promise<true>;
  abstract has(actorId: ActorId): Promise<boolean>;
  abstract subscribe<EventData>(
    actorId: ActorId,
    onEvent: (event: { id: EventId; data: EventData }) => void,
  ): { unsubscribe: Function };
}

export interface ScheduleData {
  kind: ActorKind;
  id: ActorId;
  input?: any;
}

export abstract class AdapaterScheduler {
  abstract schedule(schedule: ScheduleData): Promise<true>;
}

export abstract class AdapaterWorker {
  abstract subscribe(callback: (config: ScheduleData) => any): {
    unsubscribe: Function;
  };
}
