export type EventId = number;
export type ActorId = number;
export type ActorKind = string;
export type LockId = string;

export type ScheduleId = string;
export type Cron = { cron: string };
export type Delay = { delay: number };

export interface ScheduleByType {
  event: ScheduleEventData;
  instance: ScheduleInstanceData;
}

export type ScheduleConfig = Cron | Delay;

export interface ScheduleEventData {
  instance: ScheduleInstanceData;
  schedule: ScheduleConfig;
  event: InstanceMethodCall;
}

export interface ScheduleInstanceData {
  kind: ActorKind;
  id: ActorId;
}

export interface InstanceMethodCall {
  action: string;
  args: any[];
  mode: "normal" | "emit";
}

export interface Adapters {
  lock: AdapterLock;
  messages: AdapaterMessageBroker;
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

export abstract class AdapaterMessageBroker {
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

export abstract class AdapaterScheduler {
  abstract instance(schedule: ScheduleInstanceData): Promise<ScheduleId>;
  abstract event(schedule: ScheduleEventData): Promise<ScheduleId>;
}

export abstract class AdapaterWorker {
  abstract subscribe(
    callback: <Type extends keyof ScheduleByType>(
      type: Type,
      scheduleData: ScheduleByType[Type],
    ) => any,
  ): {
    unsubscribe: Function;
  };
}
