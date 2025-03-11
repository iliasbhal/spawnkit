import type { Instance } from "./Instance";
import type { InstanceEventChannels, InstanceEventStreamMessage, InternalInstanceEvent } from "./InstanceProxy";
import { DATA_UTILS_NAMESPACE, type InstanceUtils } from "./InstanceUtils";
import { ClientStream } from "./ClientStream";
import { RemoteError } from "./RemoteError";
import {
	Adapters,
	ScheduleId,
	Cron,
	Delay,
	InstanceId,
	EventId,
	InstanceMethodCall,
	BaseAdapter,
	InstanceIdentifier,
} from "../adapters";
import { ClientData } from "./Data";
import { HealthCheckEmitter, HealthCheckListener, InstanceStalledError } from "./HealthCheck";
import { Scheduler } from "./Scheduler";
import { nanoid } from "nanoid";
import { SpawnkitError } from './Error'
import { EventListener } from "@/utils/EventListenener";
import { computeLatency } from "@/utils/computeLatency";

export interface SpawnkitConfig {
	adapters: Adapters;
	instances: { [key: string]: typeof Instance<any, any, any> };
	config?: {
		throwOnStalledInstance?: boolean;
		disconnectOnStalledInstance?: boolean;
	}
}

export interface BaseChannel {
	error: SpawnkitError | Error,
	stalled: InstanceStalledError,
	changed: Client<any>['config'],
}

type InternalMessageData = InstanceEventChannels[keyof InstanceEventChannels];

interface InstType<Config extends SpawnkitConfig, Kind extends keyof Config['instances']> {
	Inst: InstanceType<Config["instances"][Kind]>,
	InstanceData: InstType<Config, Kind>['Inst']["__types"]["InstanceData"],
	InstanceChannels: InstType<Config, Kind>['Inst']["__types"]["InstanceChannels"],
	InstanceContext: InstType<Config, Kind>['Inst']["__types"]["InstanceContext"],
}

export class Client<CP extends SpawnkitConfig> {
	private adapters!: CP["adapters"];
	private config: ReturnType<typeof Client.createConfig<CP['config']>>;
	instances!: CP["instances"];

	eventListeners = new EventListener<BaseChannel>();
	on<K extends keyof BaseChannel>(event: K, callback: (data: BaseChannel[K]) => any) {
		return this.eventListeners.on(event, callback);
	}

	id = nanoid();
	scheduler: Scheduler<any>;

	static createConfig<Provided extends SpawnkitConfig['config']>(provided: Provided): Required<SpawnkitConfig['config']> {
		return {
			throwOnStalledInstance: provided?.throwOnStalledInstance ?? true,
			disconnectOnStalledInstance: provided?.disconnectOnStalledInstance ?? true,
		}
	}

	constructor(opts: CP) {
		this.adapters = opts.adapters;
		this.instances = opts.instances;

		this.scheduler = Scheduler.from(opts, this);
		this.config = Client.createConfig(opts.config);
		// this.linkAndValidateAdapters();
		// this.validateInstancces();
	}

	getConfig() {
		return this.config;
	}

	setConfig(config: Partial<SpawnkitConfig['config']>) {
		const nextConfig = Client.createConfig(config);
		const hasChanged = JSON.stringify(this.config) !== JSON.stringify(nextConfig);
		if (!hasChanged) return;

		this.config = nextConfig;
		this.eventListeners.notify('changed', this.config);
	}

	private linkAndValidateAdapters = () => {
		Object.values(this.adapters).forEach((adapter) => {
			const isBaseAdapter = adapter instanceof BaseAdapter;
			if (!isBaseAdapter) {
				throw new Error("Invalid Adapter, need to extend BaseAdapter");
			};
		});
	};

	private validateInstancces = () => {
		const clientInst = this.spawn('TEST_INST' as any, "__TEST_ID__", {});
		clientInst.dispose();

		Object.values(this.instances).forEach((InstanceClass: any) => {
			const inst = new InstanceClass();
			const instanceName = InstanceClass.name;


			const clientKeys = new Set(Object.keys(clientInst));
			const instanceKeys = new Set(
				Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).concat(Object.keys(inst)),
			);

			const instanceProtoKeys = new Set(
				Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(inst))),
			);

			const intersect = new Set([...Array.from(clientKeys)].filter((i) => instanceKeys.has(i)));
			const cannotUseKeys = new Set(
				[...Array.from(intersect)].filter((i) => !instanceProtoKeys.has(i)),
			);

			if (cannotUseKeys.size > 0) {
				throw new Error(
					`Cannot use reserved keys: ${Array.from(cannotUseKeys).join(", ")} in instance ${instanceName}`,
				);
			}
		});
	};

	static from<CP extends SpawnkitConfig>(opts: CP) {
		return new Client<CP>(opts);
	}

	static getChannelForEventResponse(eventId: EventId) {
		return `reply:${eventId}` as const;
	}
	static getChannelForEventBus<Channel extends string>(type: string, channel: Channel) {
		return `broadcast:${type}:${channel}` as const;
	}

	clientHealthCheck: HealthCheckEmitter;

	public start() {
		this.clientHealthCheck = new HealthCheckEmitter(this.adapters, {
			kind: "__internal__client",
			id: this.id,
		});

		this.clientHealthCheck.eventListener.on('stalled', (data) => {
			this.eventListeners.notify('stalled', data);
		});

		this.clientHealthCheck.start();
		this.scheduler.start();

		return {
			stop: () => this.stop(),
		}
	}

	public stop() {
		this.clientHealthCheck.dispose();
		return this.scheduler?.stop();
	}

	createHealthChecker(inst: { kind: string, id: string }) {
		const healthCheck = new HealthCheckListener(this.adapters, inst);
		setTimeout(() => {
			healthCheck.start();
		});

		return healthCheck;
	}

	spawn<Kind extends Extract<keyof CP["instances"], string>, SpawnContext extends InstType<CP, Kind>['InstanceContext']>(kind: Kind, instanceId: InstanceId, clientContext: SpawnContext = {} as any) {
		type Inst = InstanceType<CP["instances"][Kind]>;
		type InstTypes = ReturnType<typeof createTypeof<Inst>>;

		const instanceIdentifier = {
			id: instanceId,
			kind: kind.toString(),
		};

		const sendRPC = async (methodCallConfig: InstanceMethodCall) => {
			const [_, eventId] = await Promise.all([
				// when sending an event, we shall always try to spawn an instance
				// to ensure that the event will be processed
				this.scheduler.tryWakeInstanceUp(kind, instanceId),
				this.adapters.messages.publish(instanceIdentifier, `rpc`, methodCallConfig),
			]);

			return eventId;
		};

		const data = new ClientData<InstTypes['Data']>({
			adapters: this.adapters,
			instance: instanceIdentifier,
		});

		const createScheduledMethodHandler = () => {
			type CommonScheduleConfig = {
				name?: string;
			};

			return (schedule: CommonScheduleConfig & (Delay | Cron)) => {
				return new Proxy({} as InstTypes["ScheduleRemoteMethods"], {
					get: (target, prop, receiver) => {
						if (prop in target) return Reflect.get(target, prop, receiver);
						if (typeof prop !== "string") return;

						return async (...args: any[]) => {
							const scheduleId = await this.adapters.events.schedule({
								schedule: schedule,
								instance: {
									id: instanceId,
									kind: kind.toString(),
								},
								event: {
									action: prop,
									args,
									mode: "scheduled",
									context: {
										context: clientContext,
									},
								},
							});

							return scheduleId;
						};
					},
				});
			};
		};

		const instantEventListener = new EventListener();
		const internalEventListener = new EventListener<InternalInstanceEvent>();
		const healthCheck = this.createHealthChecker(instanceIdentifier);
		healthCheck.onHealthCheckFailed(() => {
			internalEventListener.notify("error", {
				type: "health_check_error",
				error: new InstanceStalledError(),
			});
		});

		const createEventHandler = <Channel extends Extract<keyof InstTypes['Channels'], string>, Message extends InstTypes['Channels'][Channel]>(
			channel: Channel,
			callback: (data: Message) => any,
		) => {
			const channelId = Client.getChannelForEventBus("instance", channel.toString())
			const callbackEmitter = instantEventListener.on(channel, callback);

			const subscribe = this.adapters.messages.subscribe<Message>(
				instanceIdentifier,
				channelId,
				(message) => {
					healthCheck.reset();
					callbackEmitter.notify(message.data);
				},
			);

			return {
				unsubscribe: () => {
					subscribe.unsubscribe();
					callbackEmitter.unsubscribe();
				},
			};
		}

		const createInternalEventHandler = <Channel extends Extract<keyof InternalInstanceEvent, string>, Message extends InternalInstanceEvent[Channel]>(
			channel: Channel,
			callback: (data: Message) => any,
		) => {
			const channelID = Client.getChannelForEventBus("internal", channel);
			const callbackEmitter = internalEventListener.on(channel, callback);
			const subscribe = this.adapters.messages.subscribe<Message>(
				instanceIdentifier,
				channelID,
				(message) => {
					callbackEmitter.notify(message.data);
				},
			);

			return {
				unsubscribe: () => {
					subscribe.unsubscribe();
					callbackEmitter.unsubscribe();
				},
			};
		};

		const createRemoteMethodHandler = (mode: InstanceMethodCall["mode"]) => {
			return (action: string) => {
				return async (...args: any[]) => {
					const eventId = await utils.sendRPC({
						timestamp: Date.now(),
						action,
						args,
						mode,
						context: {
							context: clientContext,
						}
					});

					if (mode === "skip") return true;
					if (mode === "scheduled") return true;

					if (mode === "normal") {
						return new Promise((resolve, reject) => {


							const internalStream = new ClientStream();
							const scope = {
								response: undefined as any,
							};

							const internalSubsciption = createInternalEventHandler("error", (message) => {
								if (message.type === 'initialize_error') {
									isDoneWaitingForResponse();
									const error = new InstanceStalledError('Instance failed to initialize');
									rejectWithError(error);
								}
							});

							const isDoneWaitingForResponse = () => {
								internalStream.close();
								scope.response?.unsubscribe();
								internalSubsciption.unsubscribe()
							};

							const rejectWithError = (error: Error) => {
								isDoneWaitingForResponse();
								internalStream.error(error);
								reject(error);
							}

							healthCheck.onHealthCheckFailed(() => {
								if (this.config.throwOnStalledInstance) {
									const error = new InstanceStalledError();
									rejectWithError(error);
								}
							});

							internalStream.on("end", () => {
								isDoneWaitingForResponse();
							});

							const handleStreamMessage = (message: InstanceEventStreamMessage) => {
								resolve(internalStream);
								internalStream.forward(message);
							};

							const handleDefaultMessage = (message: InternalMessageData) => {
								isDoneWaitingForResponse();

								if ("error" in message) {
									const error = RemoteError.deserialize(message.error);
									reject(error);
									return;
								}

								if ("response" in message) {
									resolve(message.response);
									return;
								}
							};

							const channel = Client.getChannelForEventResponse(eventId);
							scope.response = this.adapters.messages.subscribe<InternalMessageData>(
								instanceIdentifier,
								channel,
								(message) => {
									if ("stream" in message.data) return handleStreamMessage(message.data);
									if ("response" in message.data) return handleDefaultMessage(message.data);
									if ("error" in message.data) return handleDefaultMessage(message.data);
								},
							);
						});
					}

					throw new Error("Not Implemented");
				};
			};
		};

		const scheduleRemoteMethodHandler = createScheduledMethodHandler();
		const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
		const skipRemoteMethodHandler = createRemoteMethodHandler("skip");

		const remoteUtils = new Proxy({}, {
			get(target, prop, receiver) {
				if (prop in target) return Reflect.get(target, prop, receiver);
				if (typeof prop !== "string") return;
				return normalRemoteMethodHandler(`utils.${prop}`);
			},
		}) as InstTypes["RemoteProxyMethodes"];

		// const utilsData = data.withNamespace(DATA_UTILS_NAMESPACE);

		const utils = {
			sendRPC,
			on: createInternalEventHandler,
		};

		const remote = {
			ensureLive: async () => {
				const response = await remoteUtils.ping();
				return response === 'pong';
			},

			getLatency: async () => {
				await remote.ensureLive();

				const before = Date.now(); // 13h
				const remoteTime = await remoteUtils.getLocalTimeUnix(); // 15h
				const after = Date.now() // 13h:10

				return computeLatency({
					before,
					remoteTime,
					after
				});
			},

			setConcurrency: async (concurrency: number) => {
				return remoteUtils.setConcurrency(concurrency);
			},

			exists: async () => {
				return remoteUtils.exists();
			}
		};

		const instanceClientAPI = {
			id: instanceId,
			kind: kind,

			async emit<Channel extends Extract<keyof InstTypes['Channels'], string>>(
				channel: Channel,
				message: InstTypes['Channels'][Channel],
			) {
				await skipRemoteMethodHandler("emit")(channel, message);
				return true;
			},

			dispose: () => {
				healthCheck.dispose();
				instantEventListener.clear();
			},

			on: createEventHandler,

			data: data,
			context: clientContext as typeof clientContext,

			remote: remote,
			utils: utils,

			schedule: scheduleRemoteMethodHandler,
			scheduled: {
				list: async () => {
					return this.adapters.events.list(kind, instanceId);
				},
				cancel: async (scheduleId: ScheduleId) => {
					return this.adapters.events.cancel(kind, instanceId, scheduleId);
				},
				delete: async (scheduleId: ScheduleId) => {
					return this.adapters.events.delete(kind, instanceId, scheduleId);
				},
				get: async (scheduleId: ScheduleId) => {
					return this.adapters.events.get(kind, instanceId, scheduleId);
				},
			},
		} as const;

		// We use the Kind type here just o it to show nicely
		// in the intelissense. it will show as Remote<OrderBook> for example
		type Spawn<Kind> = InstTypes["RemoteMethodes"] & typeof instanceClientAPI;

		return new Proxy(instanceClientAPI, {
			get(target, prop, receiver) {
				if (prop in target) return Reflect.get(target, prop, receiver);
				if (typeof prop !== "string") return;
				return normalRemoteMethodHandler(prop);
			},
		}) as Spawn<Inst>;
	}
}

// Utility Types:

type ExtractMethodNames<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

type MakeRemote<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any
	? // If the function is sychronouse, we want to cast the return to a Promise
	// And it it's already a promise, it's gonna stay a promise.
	(...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
	: never;
};

type MakeSkippable<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any
	? (...args: Parameters<T[K]>) => Promise<boolean>
	: never;
};

type MakeSchedulable<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any
	? (...args: Parameters<T[K]>) => Promise<ScheduleId>
	: never;
};

type ExtractInstanceTypes<T extends Instance> = {
	InstanceData: T["__types"]["InstanceData"],
	InstanceChannels: T["__types"]["InstanceChannels"],
	InstanceContext: T["__types"]["InstanceContext"],
};

const createTypeof = <T extends Instance>(inst: T) => {
	type InstanceData = T["__types"]["InstanceData"];
	type InstanceChannels = T["__types"]["InstanceChannels"];
	type InstanceContext = T["__types"]["InstanceContext"];
	type InstBase = Instance<InstanceContext, InstanceData, InstanceChannels>;

	type InheritedMethods = Exclude<ExtractMethodNames<InstBase>, undefined>;
	type AvailableMethods = Omit<ExtractMethods<T>, InheritedMethods>;
	type RemoteMethodes = MakeRemote<AvailableMethods>;
	type SkipRemoteMethods = MakeSkippable<AvailableMethods>;
	type ScheduleRemoteMethods = MakeSchedulable<AvailableMethods>;

	// type AvailableProxyMethods = ExtractMethods<InstanceUtils<Inst>>
	type RemoteProxyMethodes = MakeRemote<InstanceUtils<T>>;

	return {} as {
		Data: InstanceData,
		Channels: InstanceChannels,
		Context: InstanceContext,
		Base: InstBase,
		InheritedMethods: InheritedMethods,
		AvailableMethods: AvailableMethods,
		RemoteMethodes: RemoteMethodes,
		SkipRemoteMethods: SkipRemoteMethods,
		ScheduleRemoteMethods: ScheduleRemoteMethods,
		RemoteProxyMethodes: RemoteProxyMethodes,
	}
}
