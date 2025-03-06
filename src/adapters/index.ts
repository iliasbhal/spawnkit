import { Context } from "../core/Instance";
import type { Client } from "..";

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
	instance: InstanceIdentifier;
}

type CommonScheduleConfig = {
	name?: string;
};

export type ScheduleConfig = CommonScheduleConfig & (Cron | Delay);

export interface ScheduleEventConfig {
	instance: InstanceIdentifier;
	schedule: ScheduleConfig;
	event: Omit<InstanceMethodCall, 'timestamp'>;
}

export interface InstanceIdentifier {
	kind: InstanceKind;
	id: InstanceId;
}

export interface InstanceMethodCall<Action extends string = string, Args extends any[] = any[]> {
	timestamp: number;
	action: Action;
	args: Args;
	mode: "normal" | "skip" | "scheduled";
	context: {
		scheduleId?: string;
		context: Context;
	};
}

export type InstanceLog =
	| {
		type: "log";
		message: string;
	} | {
		type: "error";
		message: string;
	}
	| {
		type: "lock:acquire:start" | "lock:acquire:failed" | "lock:acquire:success";
		duration: number;
		attemptId: string;
		resourceId: string;
	}
	| {
		type: "lock:extend:start" | "lock:extend:failed" | "lock:extend:success";
		resourceId: string;
		attemptId: string;
		duration: number;
	}
	| {
		type: "lock:release:start" | "lock:release:failed" | "lock:release:success";
		resourceId: string;
		attemptId: string;
		duration: number;
	}
	| {
		type: "lock:abort";
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
		type: "proxy:initialize:start" | "proxy:initialize:success" | "proxy:initialize:failed";
	}
	| {
		type: "proxy:dispose:start" | "proxy:dispose:success" | "proxy:dispose:failed";
	}
	| {
		type: "proxy:call:start";
		id: string;
		event: InstanceMethodCall;
	}
	| {
		type: "proxy:call:result";
		id: string;
		result: any;
	};

export class BaseAdapter {
	client!: Client<any>;
	link(client: Client<any>) {
		this.client = client;
	}
}

export abstract class AdapterLogger extends BaseAdapter {
	abstract log(instance: InstanceIdentifier, ownerId: string, log: InstanceLog): any;

	abstract list(
		instance: InstanceIdentifier,
		range: { from: number; to: number },
	): Promise<string[]>;

	abstract get(instance: InstanceIdentifier, ownerId: string): Promise<InstanceLog[]>;

	abstract delete(instance: InstanceIdentifier, range: { from: number; to: number }): Promise<any>;
}

export abstract class AdapterLock extends BaseAdapter {
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
	abstract extend(lockId: RessourceId, ownerId: LockOwnerId, duration: number): Promise<boolean>;
	abstract release(lockId: RessourceId, ownerId: LockOwnerId): Promise<boolean>;
}

export abstract class AdapaterData extends BaseAdapter {
	abstract get<Data>(kind: InstanceKind, id: InstanceId, key: string): Promise<Data | null>;
	abstract set<Data>(
		kind: InstanceKind,
		id: InstanceId,
		key: string,
		value: Data,
	): Promise<boolean>;
}

export abstract class AdapaterFile extends BaseAdapter {
	abstract download(kind: InstanceKind, id: InstanceId, key: string);
	abstract upload(kind: InstanceKind, id: InstanceId, key: string);
}

export type MessageChannel = "rpc" | `reply:${string}` | `broadcast:${string}`;

export abstract class AdapaterMessageBroker extends BaseAdapter {
	abstract publish<EventData>(
		instance: InstanceIdentifier,
		channel: MessageChannel,
		event: EventData,
		meta?: {
			client: string;
		},
	): Promise<EventId>;

	abstract ack(
		instance: InstanceIdentifier,
		channel: MessageChannel,
		messageId: EventId,
	): Promise<true>;
	abstract has(instance: InstanceIdentifier, channel: string): Promise<boolean>;
	abstract subscribe<EventData>(
		instance: InstanceIdentifier,
		channel: MessageChannel,
		onEvent: (event: { id: EventId; data: EventData }) => void,
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
	response: {
		stream: any[] | null;
		data: any | null;
		error: any | null;
	};
}

export abstract class AdapterEventScheduler extends BaseAdapter {
	abstract schedule(schedule: ScheduleEventConfig): Promise<ScheduleId>;

	abstract list(kind: InstanceKind, id: InstanceId): Promise<ScheduleEventMetadata[]>;

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

	abstract cancel(kind: InstanceKind, id: InstanceId, scheduleId: ScheduleId): Promise<boolean>;

	abstract delete(kind: InstanceKind, id: InstanceId, scheduleId: ScheduleId): Promise<boolean>;

	abstract subscribe(callback: (data: ScheduleEventConfig, context: ScheduleContext) => any): {
		unsubscribe: Function;
	};
}

export abstract class AdapaterInstanceScheduler extends BaseAdapter {
	abstract schedule(schedule: InstanceIdentifier): Promise<ScheduleId>;
	abstract subscribe(callback: (data: InstanceIdentifier, context: ScheduleContext) => any): {
		unsubscribe: Function;
	};
}
