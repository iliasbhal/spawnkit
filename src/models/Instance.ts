import { InstanceLog } from "@/adapters";
import type { InterfaceAPI } from "./InstanceProxy";

export type AnyRecord = { [key: string]: any };
export type Context = AnyRecord;

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export class Instance<
	InstanceContext extends Context = Context,
	InstanceData extends AnyRecord = AnyRecord,
	InstanceChannels extends AnyRecord = AnyRecord,
> {
	__types = {} as {
		InstanceContext: InstanceContext;
		InstanceData: InstanceData;
		InstanceChannels: InstanceChannels;
	};

	signal(signal: Prettify<InstanceLog>) {
		signal;
	}

	// TODO: FIX TYPING HERE
	// For some reason, adding types here break the client types.
	on(channel: keyof InstanceChannels, message: InstanceChannels[keyof InstanceChannels]) { }

	ctx: InstanceContext = {} as InstanceContext;

	get id() {
		return this.api.id;
	}
	get kind() {
		return this.api.kind;
	}

	initialize() { }
	dispose() { }


	api!: InterfaceAPI<InstanceData, InstanceChannels>;

	get logger() {
		return this.api.logger;
	}

	get data() {
		return this.api.data;
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

	public async waitFor(promise: Promise<any>) {
		return this.api.waitFor(promise);
	}
}
