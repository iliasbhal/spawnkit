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

type CommonScheduleConfig = {
  name?: string;
};

export type ScheduleConfig = CommonScheduleConfig & (Cron | Delay);

export interface ScheduleEventData {
  instance: ScheduleInstanceData;
  schedule: ScheduleConfig;
  event: InstanceMethodCall;
}

export interface ScheduleInstanceData {
  kind: InstanceKind;
  id: InstanceId;
}

export interface InstanceMethodCall<
  Action extends string = string,
  Args extends any[] = any[],
> {
  action: Action;
  args: Args;
  mode: "normal" | "emit" | "scheduled";
  context?: any;
}

export interface Adapters {
  lock: AdapterLock;
  data: AdapaterData;
  messages: AdapaterMessageBroker;
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

export abstract class AdapaterData {
  abstract get<Data>(instanceId: InstanceId, key: string): Promise<Data | null>;
  abstract set<Data>(
    instanceId: InstanceId,
    key: string,
    value: Data,
  ): Promise<boolean>;
}

export abstract class AdapaterMessageBroker {
  abstract publish<EventData>(
    channel: string,
    event: EventData,
  ): Promise<EventId>;

  abstract ack<EventData>(
    channel: string,
    event: { id: EventId; data: EventData },
  ): Promise<true>;
  abstract has(channel: string): Promise<boolean>;
  abstract subscribe<EventData>(
    channel: string,
    onEvent: (event: { id: EventId; data: EventData }) => void,
  ): { unsubscribe: Function };
}

export interface ScheduleEventMetadata {
  created_at: number;
  scheduleId: string;
  data: ScheduleEventData;
}

export interface ScheduleContext {
  scheduleId?: ScheduleId;

  // TODO: implement fencing key.
  // We should retrieve the fencing key from the lock
  // And forward it the Data.set call
  fencingKey?: string;
}

export interface ScheduledCallMetaData {
  start_at: number;
  ended_at: number;
  stream: boolean;
  result: any;
  error: any;
}

export abstract class AdapaterScheduler {
  abstract instance(schedule: ScheduleInstanceData): Promise<ScheduleId>;
  abstract event(schedule: ScheduleEventData): Promise<ScheduleId>;
  abstract list(
    kind: InstanceKind,
    id: InstanceId,
  ): Promise<ScheduleEventMetadata[]>;

  /* Store Schedule Metadata */
  abstract store<Data extends ScheduledCallMetaData>(
    kind: InstanceKind,
    id: InstanceId,
    scheduleId: ScheduleId,
    data: Data,
  ): Promise<any>;

  /* Retrieve Schedule Metadata */
  abstract get<Data extends ScheduledCallMetaData>(
    kind: InstanceKind,
    id: InstanceId,
    scheduleId: ScheduleId,
    last?: number,
  ): Promise<Data[]>;

  abstract cancel(
    kind: InstanceKind,
    id: InstanceId,
    scheduleId: ScheduleId,
  ): Promise<boolean>;
  abstract subscribe(
    callback: <Type extends keyof ScheduleByType>(
      type: Type,
      data: ScheduleByType[Type],
      context: ScheduleContext,
    ) => any,
  ): {
    unsubscribe: Function;
  };
}
