import { PromiseList } from "@/utils/PromiseList";
import { ControlledPromise } from "@/utils/ControlledPromise";
import { ControlledTimeout } from "@/utils/ControlledTimeout";
import { Stream } from "./Stream";
import { BaseRemoteEntity, Instance } from "./Instance";
import { HealthCheckEmitter } from "./HealthCheck";
import {
	Adapters,
	InstanceIdentifier,
	InstanceMethodCall,
	EventId,
	ScheduleId,
	ScheduledCallMetaData,
} from "../adapters";
import { SpawnkitError } from "./Error";
import { Client } from "./Client";
import { Data } from "./Data";
import { Logger } from "./Logger";
import { RemoteError } from "./RemoteError";
import { InstanceUtils } from "./InstanceUtils";

export interface InstanceProps {
	kind: string;
	id: string;
}

const InstanceAbortedError = new SpawnkitError("Instance Aborted");

export interface InstanceDataChannels {
	[key: `kind:${string}:id:${string}:data`]: { data: any };
}

export type InstanceEventRequestMessage = { error: any } | { response: any };

export type InstanceEventStreamMessage =
	| { stream: true; index: number; start: true }
	| { stream: true; index: number; data: any }
	| { stream: true; index: number; end: true }
	| { stream: true; index: number; error: Error };

export interface InstanceEventChannels {
	[key: `kind:${string}:id:${string}:event:${string}`]:
	| InstanceEventRequestMessage
	| InstanceEventStreamMessage
}

type InternalErrorType = 'initialize_error' | 'dispose_error' | 'health_check_error';

export interface InternalInstanceEvent {
	error: {
		type: InternalErrorType;
		error: Error;
	};
}

type Emit<Channels extends Record<string, any>> = <Channel extends Extract<keyof Channels, string>>(
	channel: Channel,
	data: Channels[Channel],
) => Promise<void>;

export interface InterfaceAPI<Inst extends Instance<any, any>> {
	id: string;
	kind: string;
	data: Data<Record<string, any>>;
	utils: InstanceUtils<InstanceProxy<Inst>>;
	logger: Logger;
	emit: Emit<Inst['__types']['InstanceChannels']>;
	client: Client<any>;
	waitFor: (callback: () => Promise<any>) => Promise<any>;
}

interface MessageContext {
	event: InstanceMethodCall;
	messageId: EventId;
	metadata: ScheduledCallMetaData;
}

export class InstanceProxy<Inst extends Instance> {
	public logger?: Logger;
	public abortSignal?: AbortSignal;

	public instance: Instance;
	public running: boolean = false;
	public keepAlive = new PromiseList();
	public aborted = new ControlledPromise("Aborted");

	public indenfier: InstanceIdentifier;
	public adapters: Adapters;
	public client: Client<any>;

	public data: Data<Record<string, any>>;

	private utils: InstanceUtils<InstanceProxy<Inst>>;

	constructor(config: {
		indenfier: InstanceIdentifier;
		adapters: Adapters;
		client: Client<any>;
		ownerId: string;
	}) {

		this.indenfier = config.indenfier;
		this.adapters = config.adapters;
		this.client = config.client;

		const Instance = this.client.instances[config.indenfier.kind];
		if (!Instance) {
			throw new Error(`Instance Kind Not Implemented (received: ${config.indenfier.kind})`);
		}

		this.logger = new Logger({
			adapters: this.adapters,
			ownerId: config.ownerId,
			instance: config.indenfier,
		});

		this.data = new Data<Record<string, any>>({
			adapters: this.adapters,
			instance: this.indenfier,
			logger: this.logger,
		});

		this.utils = new InstanceUtils(this);

		this.instance = new Instance();
		this.configureInstance();
	}

	public syncWithAbortSignal(abortSignal: AbortSignal) {
		this.abortSignal = abortSignal;
	}

	configureInstance() {
		this.instance.api = {
			id: this.indenfier.id,
			kind: this.indenfier.kind,

			emit: (channel, data) => {
				return this.emit(channel, data);
			},

			waitFor: (callback: () => Promise<any>) => {
				return this.runExternalEffect(callback);
			},

			logger: this.logger,
			utils: this.utils,
			data: this.data,
			client: this.client,
		};
	}

	public async callMethodDefinedInEvent(
		messageId: EventId,
		event: InstanceMethodCall,
	): Promise<any> {
		const { action, args } = event;

		const handleRequestResponse = this.createResultHandler(messageId, event);

		this.trace({
			type: "proxy:call:start",
			id: messageId,
			event,
		});

		// Wrap the method in a Promise. to ensure that if the method is sync
		// We still catch the error if one happens.
		const [error, response] = await Promise.resolve()
			.then(async () => {
				this.healthCheckEmitter.assertNotStalled(event);

				this

				const method = this.createMethodForRequest(event);
				const methodExists = typeof method == "function";
				if (!methodExists) throw new Error(`Bad Request: Method not found (received: ${action})`);

				// Abort the request response when the instance is aborted
				return await Promise.race([
					method?.(...args),
					this.aborted.await.then(() => { throw InstanceAbortedError }),
				]);
			})
			.then((res) => [null, res])
			.catch((err) => [err, null]);

		await handleRequestResponse({
			error,
			response,
		});
	}

	createProxyInstanceForRequest(target: BaseRemoteEntity, event: InstanceMethodCall,) {
		return new Proxy(target, {
			get: (base, prop, receiver) => {
				if (prop === "context") {

					return event.context.context;
				}

				return Reflect.get(base, prop, receiver);
			},
		})
	}

	createMethodForRequest(event: InstanceMethodCall) {
		const { action } = event;

		const isClientInternalCall = action.startsWith("utils.");
		if (isClientInternalCall) {
			const methodName = action.slice("utils.".length);
			const proxiedUtils = this.createProxyInstanceForRequest(this.utils, event)
			const method = this.instance.utils[methodName]?.bind?.(proxiedUtils);
			return method;
		}

		const proxiedInst = this.createProxyInstanceForRequest(this.instance, event)
		const method = this.instance[action]?.bind?.(proxiedInst);
		return method;
	}

	createResultHandler(messageId: EventId, event: InstanceMethodCall) {
		const startedAt = Date.now();
		const reponseContext: MessageContext = {
			messageId,
			event,
			metadata: {
				start_at: startedAt,
				ended_at: null as any,
				response: {
					stream: null,
					data: null,
					error: null,
				},
			},
		};

		return async (result: { error: Error; response: any }) => {
			const isStream = result.response instanceof Stream;

			const response = isStream
				? await this.handleStreamResult(result.response, reponseContext)
				: await this.handleBasicResult(result, reponseContext);

			return response;
		};
	}

	async handleBasicResult<Response>(
		result: { error: Error; response: Response },
		context: MessageContext,
	) {
		const promise = this.keepAlive.addControlled();
		context.metadata.ended_at = Date.now();

		if (result.error) {
			const serializedError = RemoteError.serialize(result.error);
			context.metadata.response.error = serializedError;
			await this.respond(context, {
				error: serializedError,
			});
		} else {
			context.metadata.response.data = result.response;
			await this.respond(context, {
				response: result.response,
			});
		}

		await this.storeMetadataForScheduledCall(context);
		promise.resolve(result);
		return promise.await;
	}

	handleStreamResult(stream: Stream<any>, context: MessageContext) {
		const promise = this.keepAlive.addControlled();
		context.metadata.response.stream = [];
		let steamIdx = 0;

		stream.on("start", () => {
			this.respond(context, {
				stream: true,
				index: steamIdx++,
				start: true,
			});
		});

		stream.on("data", (data) => {
			context.metadata.response.stream!.push(data);
			this.respond(context, {
				stream: true,
				index: steamIdx++,
				data: data,
			});
		});

		const handleError = async (error: Error) => {
			const serializedError = RemoteError.serialize(error);
			context.metadata.response.error = serializedError;
			await this.respond(context, {
				stream: true,
				index: steamIdx++,
				error: serializedError as Error,
			});

			promise.resolve(error);
		};

		stream.on("error", (err) => handleError(err));
		const syncAbort = this.addAbortListener(() => {
			handleError(new Error("Worker Aborted"));
		});

		// const stalledListener = this.healthCheckEmitter.eventListener
		// 	.on("stalled", (error) => {
		// 			handleError(error)
		// 	});


		stream.on("end", async () => {
			syncAbort.clear();
			// stalledListener.unsubscribe();

			context.metadata.ended_at = Date.now();
			await this.respond(context, {
				stream: true,
				index: steamIdx++,
				end: true,
			});

			// once the stream has ended, we shall store the result of the compute;
			await this.storeMetadataForScheduledCall(context);
			promise.resolve(true);
		});

		stream.start();
		return promise.await;
	}

	trace(...args: Parameters<typeof this.logger.log>) {
		Promise.allSettled([
			Promise.resolve().then(() => this.instance.signal?.(...args)),
			Promise.resolve().then(() => this.logger.log(...args)),
		]);
	}

	/** Starts listening to events */
	public async start() {
		this.running = true;
		this.continouslyEmitHealthCheckSignal();

		const syncAbort = this.addAbortListener(() => {
			if (!this.live) return;

			this.keepAlive.clear();
			this.dispose();
			this.aborted.resolve(true);
		});

		await this.initialize()
			.catch(async (err) => {
				await this.dispose();
				throw err;
			});

		this.subscribeToInstanceEvent();
		this.subscribeToInternalEvent();

		await this.keepAliveUntilNothingHappens()
			.finally(() => syncAbort.clear());
	}

	public async stop() {
		this.unsubscribeFromInstanceEvent();
		this.aborted.resolve(true);
		this.dispose();
	}

	initialized = false;
	async initialize() {
		try {
			this.trace({ type: "proxy:initialize:start" });

			await this.instance.setup();

			for (const hook of this.instance.hooks.initialize) {
				await hook();
			}

			await this.instance.initialize?.();

			this.trace({ type: "proxy:initialize:success" });

		} catch (err) {
			this.trace({ type: "proxy:initialize:failed" });

			this.emitInternal("error", {
				type: "initialize_error",
				error: RemoteError.serialize(err),
			});

			this.client.eventListeners.notify("error", err);
			throw err;
		}

		const lastInitializedTimestamp = Date.now();
		this.utils.setLastInitialized(lastInitializedTimestamp);
		this.initialized = true;
	}

	public async dispose() {
		if (!this.running) return;
		this.running = false;
		this.unsubscribeFromInstanceEvent();
		this.data.dispose();

		try {
			this.trace({ type: "proxy:dispose:start" });
			if (this.initialized) {
				for (const hook of this.instance.hooks.dispose) {
					await hook();
				}

				await this.instance.dispose?.();
			}
			this.trace({ type: "proxy:dispose:success" });
		} catch (err) {
			this.trace({ type: "proxy:dispose:failed" });
			this.client.eventListeners.notify("error", err);
			throw err;
		} finally {
			this.healthCheckEmitter?.dispose();

			// When the instance receives the 'dispose' event
			// it should immedately schedule a dispose function
			// using this.waitFor function.
			this.keepAlive.addWait(0, "wait for dispose scheduling");
		}
	}

	public get live() {
		if (!this.running) return false;
		if (this.keepAlive.fulfilled) return false;
		if (this.aborted.fulfilled) return false;
		return true;
	}

	protected async runExternalEffect<T>(
		callback: () => Promise<T>,
		debugId?: string,
	): Promise<void> {
		if (this.aborted.fulfilled) {
			// silence attempt
			return;
		}

		const pending = this.keepAlive.addControlled(debugId);

		Promise.resolve()
			.then(callback)
			.then(() => pending.resolve(true))
			.catch((err) => pending.reject(err));

		await pending.await;
	}

	public healthCheckEmitter: HealthCheckEmitter | undefined;
	public continouslyEmitHealthCheckSignal() {
		this.healthCheckEmitter = new HealthCheckEmitter(this.adapters, this.instance);
		this.healthCheckEmitter.start();

		this.healthCheckEmitter.eventListener.on("stalled", (err) => {
			const serializedErr = RemoteError.serialize(err);
			this.instance.signal({
				type: 'error',
				message: serializedErr.message,
			});
		});
	}

	public onEventSubscription: { unsubscribe: Function } | undefined;
	public subscribeToInstanceEvent() {
		const NO_EVENT_TIMEOUT = 3000;
		const timer = new ControlledTimeout();
		timer.start(NO_EVENT_TIMEOUT);


		this.onEventSubscription = this.adapters.messages.subscribe<InstanceMethodCall>(
			this.instance,
			"rpc",
			async (event) => {
				this.keepAlive.addWait(300, "Event Received");
				timer.restart(NO_EVENT_TIMEOUT);

				const processed = Promise.resolve()
					.then(() => this.callMethodDefinedInEvent(event.id, event.data))
					.finally(() => this.adapters.messages.ack(this.instance, "rpc", event.id));

				this.keepAlive.add(processed);
			},
		);

		this.keepAlive.add(timer.await);
	}

	public emittedEventSubscription: { unsubscribe: Function } | undefined;
	public subscribeToInternalEvent() {
		// const channelID = Client.getChannelForEventBus("internal", 'all');
		// this.emittedEventSubscription = this.adapters.messages.subscribe(this.instance, channelID, (message) => {
		// 	// CAN BE USED TO HANDLE INTERNAL EVENTS
		// 	// LIKE REMOTE EVICTION
		// });
	}

	public unsubscribeFromInstanceEvent() {
		this.onEventSubscription?.unsubscribe();
		this.emittedEventSubscription?.unsubscribe();
	}

	public async emitInternal<Channel extends keyof InternalInstanceEvent>(channel: Channel, message: InternalInstanceEvent[Channel]) {
		const channelID = Client.getChannelForEventBus("internal", channel);
		await this.adapters.messages.publish(this.instance, channelID, message);
	}

	public async emit(channel: string, data: any) {
		const channelID = Client.getChannelForEventBus("instance", channel.toString());
		return this.runExternalEffect(async () => {
			return await this.adapters.messages.publish(this.instance, channelID, data);
		});
	}

	/** this function is used to emit message to one client,
	 * also for type safety, so that so that it doesn't show on client.on channel name autocomplete
	 **/
	public async respond(context: MessageContext, result: any) {
		this.trace({
			type: "proxy:call:result",
			id: context.messageId,
			result,
		});

		// only when mode is normal, we should respond
		// when mode is 'scheduled' or 'skip' we should not respond
		// since there is no client waiting for the response
		const shouldRespond = context.event.mode === "normal"
		if (!shouldRespond) {
			return;
		}

		const channelID = Client.getChannelForEventResponse(context.messageId);
		return this.runExternalEffect(async () => {
			return await this.adapters.messages.publish(this.instance, channelID, result);
		});
	}

	public async storeMetadataForScheduledCall(context: MessageContext) {
		const scheduleId = context.event.context?.scheduleId;
		if (!scheduleId) {
			return;
		}

		await this.adapters.events.store(
			this.instance.kind,
			this.instance.id,
			scheduleId,
			context.metadata,
		);
	}

	private addAbortListener(callback: () => any) {
		this.abortSignal.addEventListener("abort", callback);

		const disposeListener = () => {
			this.abortSignal.removeEventListener("abort", callback);
		};

		this.aborted.await.finally(() => disposeListener());

		return {
			clear: disposeListener,
		};
	}

	public async keepAliveUntilNothingHappens() {
		await this.keepAlive.waitOnAll();
		await this.dispose();

		// When we call .dispose() there is maybe a new effect
		// that is initiated to save or do some cleanup.
		// we should wait for newly created operation to complete
		// before yielding the promise. It the equivalent of a gracefull shutdown
		await this.keepAlive.waitOnAll();
	}
}