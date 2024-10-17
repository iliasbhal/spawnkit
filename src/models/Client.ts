import type { Instance } from "./Instance";
import type { InstanceEventChannels, InstanceEventStreamMessage } from "./InstanceProxy";
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
import { ClientData } from "./ClientData";
import { HealthCheckEmitter, HealthCheckListener, InstanceStalledError } from "./HealthCheck";
import { Scheduler } from "./Scheduler";
import { nanoid } from "nanoid";
import { SpawnkitError } from './Error'
import { EventListener } from "@/utils/EventListenener";
import { Toleration, Trait } from './Toleration'

export interface SpawnkitConfig {
	adapters: Adapters;
	instances: { [key: string]: typeof Instance<any, any, any> };
	config?: {
		throwOnStalledInstance?: boolean;
		disconnectOnStalledInstance?: boolean;
		traits?: Trait[];
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
			traits: provided?.traits ?? [],
		}
	}

	constructor(opts: CP) {
		this.adapters = opts.adapters;
		this.instances = opts.instances;

		this.scheduler = Scheduler.from(opts, this);
		this.config = Client.createConfig(opts.config);
		this.linkAndValidateAdapters();
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

	onInstanceAffinityChanged(identifier: InstanceIdentifier) {
		this.scheduler.revalidateInstanceAffinity(identifier);
	}

	private linkAndValidateAdapters = () => {
		Object.values(this.adapters).forEach((adapter) => {
			if (adapter instanceof BaseAdapter) {
				adapter.link(this);
				return;
			}

			throw new Error("Invalid Adapter, need to extend BaseAdapter");
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

	spawn<Kind extends Extract<keyof CP["instances"], string>, SpawnContext extends InstType<CP, Kind>['InstanceContext']>(kind: Kind, instanceId: InstanceId, context: SpawnContext = {} as any) {
		type Inst = InstanceType<CP["instances"][Kind]>;
		type InstanceData = Inst["__types"]["InstanceData"];
		type InstanceChannels = Inst["__types"]["InstanceChannels"];
		type InstanceContext = Inst["__types"]["InstanceContext"];

		type InheritedMethods = Exclude<ExtractMethodNames<Instance>, undefined>;
		type AvailableMethods = Omit<ExtractMethods<Inst>, InheritedMethods>;
		type RemoteMethodes = MakeRemote<AvailableMethods>;
		type SkipRemoteMethods = MakeSkippable<AvailableMethods>;
		type ScheduleRemoteMethods = MakeSchedulable<AvailableMethods>;

		const instanceIdentifier = {
			id: instanceId,
			kind: kind.toString(),
		};

		const sendEventToInstance = async (methodCallConfig: InstanceMethodCall) => {
			const [_, eventId] = await Promise.all([
				// when sending an event, we shall always try to spawn an instance
				// to ensure that the event will be processed
				this.scheduler.tryWakeInstanceUp(kind, instanceId),
				this.adapters.messages.publish(instanceIdentifier, `rpc`, methodCallConfig),
			]);

			return eventId;
		};

		const data = new ClientData<InstanceData>({
			adapters: this.adapters,
			instance: instanceIdentifier,
		});

		const createScheduledMethodHandler = () => {
			type CommonScheduleConfig = {
				name?: string;
			};

			return (schedule: CommonScheduleConfig & (Delay | Cron)) => {
				return new Proxy({} as ScheduleRemoteMethods, {
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
										context: context,
									},
								},
							});

							return scheduleId;
						};
					},
				});
			};
		};

		const eventListeners = new EventListener();
		const healthCheck = this.createHealthChecker(instanceIdentifier);
		healthCheck.onHealthCheckFailed(() => {
			eventListeners.notify("error", new InstanceStalledError());
		});

		const createRemoteMethodHandler = (mode: InstanceMethodCall["mode"]) => {
			return (action: string) => {
				return async (...args: any[]) => {
					const eventId = await sendEventToInstance({
						timestamp: Date.now(),
						action,
						args,
						mode,
						context: {
							context: context,
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

							const isDoneWaitingForResponse = () => {
								internalStream.close();
								scope.response?.unsubscribe();
							};

							healthCheck.onHealthCheckFailed(() => {
								isDoneWaitingForResponse();

								if (this.config.throwOnStalledInstance) {
									const error = new InstanceStalledError();
									internalStream.error(error);
									reject(error);
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


		const internalProxy = this.scheduler.createInternalProxy(kind, instanceId);

		const createEventHandler = <Channel extends Extract<keyof InstanceChannels, string>>(
			channel: Channel,
			callback: (data: InstanceChannels[Channel]) => any,
		) => {
			const callbackEmitter = eventListeners.on(channel, callback);

			const subscribe = this.adapters.messages.subscribe<InstanceChannels[Channel]>(
				instanceIdentifier,
				Client.getChannelForEventBus("instance", channel.toString()),
				(message) => {
					healthCheck.reset();
					callbackEmitter.notify(message.data);
				},
			);

			const dispose = () => {
				subscribe.unsubscribe();
				callbackEmitter.unsubscribe();
			};

			return {
				unsubscribe: () => {
					dispose();
				},
			};
		}

		const instanceClientAPI = {
			id: instanceId,
			kind: kind,

			async emit<Channel extends Extract<keyof InstanceChannels, string>>(
				channel: Channel,
				message: InstanceChannels[Channel],
			) {
				await skipRemoteMethodHandler("emit")(channel, message);
				return true;
			},

			dispose: () => {
				healthCheck.dispose();
				eventListeners.clear();
			},

			on: createEventHandler,

			data: data,
			context: context as typeof context,

			internals: {
				sendEventToInstance,
				wakeUpInstance: () => this.scheduler.tryWakeInstanceUp(kind, instanceId),
				ensureLive: () => { },
				getAffinities: internalProxy.instance.internals.getAffinities,
				setAffinities: internalProxy.instance.internals.setAffinities,
			},

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
		type Spawn<Kind> = RemoteMethodes & typeof instanceClientAPI;

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
