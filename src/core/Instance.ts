import { InstanceLog } from "@/adapters";
import type { InterfaceAPI } from "./InstanceProxy";
import { InstancePlugin } from "@/plugins/_common";

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
	InstanceData extends AnyRecord = AnyRecord,
	InstanceChannels extends AnyRecord = AnyRecord,
> extends BaseRemoteEntity<InstanceContext> {
	__types = {} as {
		InstanceContext: InstanceContext;
		InstanceData: InstanceData;
		InstanceChannels: InstanceChannels;
	};

	async setup() {
		return new Promise((resolve) => {
			setTimeout(() => {

				// Recursively setup plugins in the instance
				// If a plugin has a plugin, it will be setup too
				const setupPlugin = (root: any) => {
					Object.keys(root).forEach(key => {
						const plugin = root[key];
						const isPlugin = plugin instanceof InstancePlugin;
						if (!isPlugin) return;

						plugin.inject(this);
						setupPlugin(plugin);
						plugin.setup();
					})
				}

				setupPlugin(this);
				resolve(true);
			})
		})
	}

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
	};

	initialize() { }

	dispose() { }

	api!: InterfaceAPI<Instance<InstanceContext, InstanceData, InstanceChannels>>;

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

	private validateInstancces = () => {
		// const clientInst = this.spawn('TEST_INST' as any, "__TEST_ID__", {});
		// clientInst.dispose();

		// Object.values(this.instances).forEach((InstanceClass: any) => {
		// 	const inst = new InstanceClass();
		// 	const instanceName = InstanceClass.name;


		// 	const clientKeys = new Set(Object.keys(clientInst));
		// 	const instanceKeys = new Set(
		// 		Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).concat(Object.keys(inst)),
		// 	);

		// 	const instanceProtoKeys = new Set(
		// 		Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(inst))),
		// 	);

		// 	const intersect = new Set([...Array.from(clientKeys)].filter((i) => instanceKeys.has(i)));
		// 	const cannotUseKeys = new Set(
		// 		[...Array.from(intersect)].filter((i) => !instanceProtoKeys.has(i)),
		// 	);

		// 	if (cannotUseKeys.size > 0) {
		// 		throw new Error(
		// 			`Cannot use reserved keys: ${Array.from(cannotUseKeys).join(", ")} in instance ${instanceName}`,
		// 		);
		// 	}
		// });
	};
}

