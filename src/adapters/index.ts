import { Lock } from "@/models/Lock";

export type InstanceId = string;
export type InstanceKind = string;
export type EventId = string;
export type RessourceId = string;
export type LockOwnerId = string;

export type ScheduleId = string;
export type Cron = { cron: string };
export type Delay = { delay: number };

export interface Adapters {
  lock: AdapterLock;
  data: AdapaterData;
  messages: AdapaterMessageBroker;
  events: AdapterEventScheduler;
  instances: AdapaterInstanceScheduler;
  logger?: AdapterLogger;
}

export interface ScheduleByType {
  event: ScheduleEventConfig;
  instance: ScheduleInstanceData;
}

type CommonScheduleConfig = {
  name?: string;
};

export type ScheduleConfig = CommonScheduleConfig & (Cron | Delay);

export interface ScheduleEventConfig {
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
  mode: "normal" | "skip" | "scheduled";
  context?: any;
}

export type InstanceSignal =
  | {
      type: "log";
      message: string;
    }
  | {
      type: "lock:acquire";
      duration: number;
    }
  | {
      type: "lock:abort";
    }
  | {
      type: "lock:extend";
      duration: number;
    }
  | {
      type: "lock:release";
    }
  | {
      type: "data:get";
      key: string;
    }
  | {
      type: "data:set";
      key: string;
      value: any;
    }
  | {
      type: "proxy:start";
    }
  | {
      type: "proxy:dispose";
    }
  | {
      type: "proxy:call:start";
      id: string;
      method: string;
      args: any[];
    }
  | {
      type: "proxy:call:end";
      id: string;
      result: any;
    };

export abstract class AdapterLogger {
  abstract log(
    kind: InstanceKind,
    id: InstanceId,
    groupId: string,
    signal: InstanceSignal,
  ): any;

  abstract list(
    kind: InstanceKind,
    id: InstanceId,
    range: { from: number; to: number },
  ): Promise<string[]>;

  abstract get(
    kind: InstanceKind,
    id: InstanceId,
    groupId: string,
  ): Promise<InstanceSignal[]>;

  abstract delete(
    kind: InstanceKind,
    id: InstanceId,
    range: { from: number; to: number },
  ): Promise<any>;
}

export abstract class AdapterLock {
  /*
   *
   */
  abstract acquire(
    lockId: RessourceId,
    /* The owner id is a string that cannot be used by other processes claiming the lock
     *  It should be a unique value across the entire cluster.
     */
    ownerId: LockOwnerId,
    duration: number,
  ): Promise<boolean>;
  abstract extend(
    lockId: RessourceId,
    ownerId: LockOwnerId,
    duration: number,
  ): Promise<boolean>;
  abstract release(lockId: RessourceId, ownerId: LockOwnerId): Promise<boolean>;
}

export abstract class AdapaterData {
  abstract get<Data>(
    kind: InstanceKind,
    id: InstanceId,
    key: string,
  ): Promise<Data | null>;
  abstract set<Data>(
    kind: InstanceKind,
    id: InstanceId,
    key: string,
    value: Data,
  ): Promise<boolean>;
}

export abstract class AdapaterMessageBroker {
  abstract publish<EventData>(
    channel: string,
    event: EventData,
    options?: {
      mode: "pubsub";
    },
  ): Promise<EventId>;

  abstract ack<EventData>(
    channel: string,
    event: { id: EventId; data: EventData },
  ): Promise<true>;
  abstract has(channel: string): Promise<boolean>;
  abstract subscribe<EventData>(
    channel: string,
    onEvent: (event: { id: EventId; data: EventData }) => void,
    options?: {
      mode: "pubsub";
    },
  ): { unsubscribe: Function };
}

export interface ScheduleEventMetadata {
  created_at: number;
  canceled: boolean;
  scheduleId: string;
  config: ScheduleEventConfig;
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

export abstract class AdapterEventScheduler {
  abstract schedule(schedule: ScheduleEventConfig): Promise<ScheduleId>;

  abstract list(
    kind: InstanceKind,
    id: InstanceId,
  ): Promise<ScheduleEventMetadata[]>;

  /* Store Schedule Results */
  abstract store<Data extends ScheduledCallMetaData>(
    kind: InstanceKind,
    id: InstanceId,
    scheduleId: ScheduleId,
    data: Data,
  ): Promise<any>;

  /* Retrieve Schedule Results */
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

  abstract delete(
    kind: InstanceKind,
    id: InstanceId,
    scheduleId: ScheduleId,
  ): Promise<boolean>;

  abstract subscribe(
    callback: (data: ScheduleEventConfig, context: ScheduleContext) => any,
  ): {
    unsubscribe: Function;
  };
}

export abstract class AdapaterInstanceScheduler {
  abstract schedule(schedule: ScheduleInstanceData): Promise<ScheduleId>;

  abstract subscribe(
    callback: (data: ScheduleInstanceData, context: ScheduleContext) => any,
  ): {
    unsubscribe: Function;
  };
}
