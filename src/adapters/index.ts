export type EventId = number;
export type InstanceId = number;
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
  id: InstanceId;
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
  abstract get<Data>(instanceId: InstanceId): Promise<Data | null>;

  abstract set<Data>(instanceId: InstanceId, snapshot: Data): Promise<true>;

  abstract subscribe<Data>(
    instanceId: InstanceId,
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
    instanceId: InstanceId,
    event: EventData,
  ): Promise<EventId>;

  abstract ack(instanceId: InstanceId, eventId: EventId): Promise<true>;
  abstract has(instanceId: InstanceId): Promise<boolean>;
  abstract subscribe<EventData>(
    instanceId: InstanceId,
    onEvent: (event: { id: EventId; data: EventData }) => void,
  ): { unsubscribe: Function };
}

export interface ScheduleEventMetadata {
  created_at: number;
  scheduleId: string;
  data: ScheduleEventData;
}

export abstract class AdapaterScheduler {
  abstract instance(schedule: ScheduleInstanceData): Promise<ScheduleId>;
  abstract event(schedule: ScheduleEventData): Promise<ScheduleId>;
  abstract list(): Promise<ScheduleEventMetadata[]>;
  abstract cancel(scheduleId: ScheduleId): Promise<boolean>;
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
