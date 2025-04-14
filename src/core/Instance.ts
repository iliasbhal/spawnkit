import { InstanceLog } from "@/adapters/_common";
import type { InterfaceAPI } from "./InstanceProxy";
import { InstancePlugin } from "@/plugins/InstancePlugin";

export type AnyRecord = { [key: string]: any };
export type Context = AnyRecord;

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export class BaseRemoteEntity<InstanceContext extends Context = Context> {
	protected context: InstanceContext = {} as InstanceContext;
}

export class Instance<
	InstanceContext extends Context = Context,
	InstanceChannels extends AnyRecord = AnyRecord,
> extends BaseRemoteEntity<InstanceContext> {
	__types = {} as {
		InstanceContext: InstanceContext;
		InstanceChannels: InstanceChannels;
	};



	signal(signal: Prettify<InstanceLog>) {
		signal;
	}

	// TODO: FIX TYPING HERE
	// For some reason, adding types here break the client types.
	on(channel: keyof InstanceChannels, message: InstanceChannels[keyof InstanceChannels]) {
		channel;
		message;
	}

	get id() {
		return this.api.id;
	}

	get kind() {
		return this.api.kind;
	}

	// plugins will add stuff here to the instance
	// that we'll be able to use in the instance
	hooks = {
		initialize: [] as Function[],
		dispose: [] as Function[],
		// middleware: [] as Function[],
	};

	initialize() { }

	dispose() { }

	api!: InterfaceAPI<Instance<InstanceContext, InstanceChannels>>;

	get logger() {
		return this.api.logger;
	}

	get data() {
		return this.api.data;
	}

	get utils() {
		return this.api.utils;
	}

	/** this will send a message to all client subscribed to this instance specified channel */
	public async emit<Channel extends Extract<keyof InstanceChannels, string>>(
		channel: Channel,
		message: InstanceChannels[Channel],
	) {
		await this.api.emit(channel, message);

		try {
			this.on?.(channel, message);
		} catch (err) {
			// SILENCE ANY ERROR HAPPENING DURING THE EVENT HANDLER
			// console.log(err);
		}

		return;
	}

	public async waitFor(callback: () => Promise<any>) {
		return this.api.waitFor(callback);
	}
}

