export type InstanceId = string;
export type InstanceKind = string;
export type EventId = string;
export type LockId = string;
export type LockOwnerId = string;

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
  kind: InstanceKind;
  id: InstanceId;
}

export interface InstanceMethodCall {
  action: string;
  args: any[];
  mode: "normal" | "emit" | "scheduled";
}

export interface Adapters {
  lock: AdapterLock;
  messages: AdapaterMessageBroker;
  snapshot: AdapaterSnapshot;
  scheduler: AdapaterScheduler;
}

export abstract class AdapterLock {
  /*
   *
   */
  abstract acquire(
    lockId: LockId,
    /* The owner id is a string that cannot be used by other processes claiming the lock
     *  It should be a unique value across the entire cluster.
     */
    ownerId: LockOwnerId,
    duration: number,
  ): Promise<boolean>;
  abstract extend(
    lockId: LockId,
    ownerId: LockOwnerId,
    duration: number,
  ): Promise<boolean>;
  abstract release(lockId: LockId, ownerId: LockOwnerId): Promise<boolean>;
}

export abstract class AdapaterSnapshot {
  abstract load<Data>(instanceId: InstanceId): Promise<Data | null>;
  abstract save<Data>(instanceId: InstanceId, snapshot: Data): Promise<true>;
  abstract subscribe<Data>(
    instanceId: InstanceId,
    onSnapshot: (snapshot: Data) => void,
  ): { unsubscribe: Function };
}

export abstract class AdapaterMessageBroker {
  abstract publish<EventData>(
    instanceId: InstanceId,
    event: EventData,
  ): Promise<EventId>;

  abstract ack<EventData>(
    instanceId: InstanceId,
    event: { id: EventId; data: EventData },
  ): Promise<true>;
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
  abstract subscribe(
    callback: <Type extends keyof ScheduleByType>(
      type: Type,
      scheduleData: ScheduleByType[Type],
    ) => any,
  ): {
    unsubscribe: Function;
  };
}
