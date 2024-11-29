// import { InstanceId, InstanceIdentifier, InstanceMethodCall } from "@/adapters";
// import type { Client } from "./Client";

// import type { Instance } from "./Instance";
// import type { InstanceEventChannels, InstanceEventStreamMessage } from "./InstanceProxy";
// import { ClientStream } from "./ClientStream";
// import { RemoteError } from "./RemoteError";
// import {
//   Adapters,
//   ScheduleId,
//   Cron,
//   Delay,
//   EventId,
//   BaseAdapter,
// } from "../adapters";
// import { ClientData } from "./ClientData";
// import { HealthCheckEmitter, HealthCheckListener, InstanceStalledError } from "./HealthCheck";
// import { Queue } from "./Queue";
// import { nanoid } from "nanoid";
// import { SpawnkitError } from './Error'
// import { EventListener } from "@/utils/EventListenener";

// class ClientInstance<Cl extends Client<any>, InstId extends InstanceIdentifier> {
//   client: Cl;
//   instance: InstId

//   constructor(client: Cl, instance: InstId) {
//     this.client = client;
//     this.instance = instance;

//     this.data = new ClientData<InstanceData>({
//       adapters: this.client.adapters,
//       instance: this.instance,
//     });
//   }

//   data = new ClientData<InstanceData>({
//     adapters: this.client.adapters,
//     instance: this.instance,
//   })

//   createHealthChecker(inst: { kind: string, id: string }) {
//     const healthCheck = new HealthCheckListener(this.adapters, inst);
//     setTimeout(() => {
//       healthCheck.start();
//     });

//     return healthCheck;
//   }

//   timestampByInstance = new Map<InstanceId, number>();
//   private shouldScheduleInstance(instanceId: InstanceId) {
//     const now = Date.now();
//     const lastSentEventTimesamp = this.timestampByInstance.get(instanceId);
//     this.timestampByInstance.set(instanceId, now);

//     if (!lastSentEventTimesamp) {
//       return true;
//     }

//     const timeSinceLastEventSent = now - lastSentEventTimesamp;
//     const shouldScheduleInstance = timeSinceLastEventSent > 1000;
//     return shouldScheduleInstance;
//   }

//   wakeUp<Kind extends Extract<keyof CP["instances"], string>>(
//     kind: Kind,
//     instanceId: InstanceId,
//   ) {
//     // In the case that we are sending a lot of events
//     // We don't have to try to schedule an instance together with every event we send.
//     // Once an instance terminate, it will try again 3 times to check if there are pending events process.
//     // We can rely on this fact to only schedule an instance if it has been a long time since last event push.
//     // This is mainly to avoid adding unnessessary pressure the backend.
//     const canScheduleInstance = this.shouldScheduleInstance(instanceId);
//     if (canScheduleInstance) {
//       const instanceAlreadyRunningOnThisWorker = this.isInstanceRunning(
//         kind.toString(),
//         instanceId,
//       );
//       if (instanceAlreadyRunningOnThisWorker) {
//         return;
//       }

//       this.client.adapters.instances.schedule({
//         id: instanceId,
//         kind: kind.toString(),
//       });
//     }
//   }

//   spawn(kind: InstId['kind'], instanceId: InstId['id'], context: InstType<CP, Kind>['InstanceContext']) {
//     type Inst = InstanceType<typeof this.client["instances"][typeof kind]>;
//     type InstanceData = Inst["__types"]["InstanceData"];
//     type InstanceChannels = Inst["__types"]["InstanceChannels"];
//     type InstanceContext = Inst["__types"]["InstanceContext"];

//     type InheritedMethods = Exclude<ExtractMethodNames<typeof this.instance>, undefined>;
//     type AvailableMethods = Omit<ExtractMethods<Inst>, InheritedMethods>;
//     type RemoteMethodes = MakeRemote<AvailableMethods>;
//     type SkipRemoteMethods = MakeSkippable<AvailableMethods>;
//     type ScheduleRemoteMethods = MakeSchedulable<AvailableMethods>;

//     const instanceIdentifier = {
//       id: instanceId,
//       kind: kind.toString(),
//     };

//     const sendRPC = async (methodCallConfig: InstanceMethodCall) => {
//       const [_, eventId] = await Promise.all([
//         // when sending an event, we shall always try to spawn an instance
//         // to ensure that the event will be processed
//         this.client.tryWakeInstanceUp(kind, instanceId),
//         this.client.adapters.messages.publish(instanceIdentifier, `rpc`, methodCallConfig),
//       ]);

//       return eventId;
//     };

//     const data = new ClientData<InstanceData>({
//       adapters: this.adapters,
//       instance: instanceIdentifier,
//     });

//     const createScheduledMethodHandler = () => {
//       type CommonScheduleConfig = {
//         name?: string;
//       };

//       return (schedule: CommonScheduleConfig & (Delay | Cron)) => {
//         return new Proxy({} as ScheduleRemoteMethods, {
//           get: (target, prop, receiver) => {
//             if (prop in target) return Reflect.get(target, prop, receiver);
//             if (typeof prop !== "string") return;

//             return async (...args: any[]) => {
//               const scheduleId = await this.client.adapters.events.schedule({
//                 schedule: schedule,
//                 instance: {
//                   id: instanceId,
//                   kind: kind.toString(),
//                 },
//                 event: {
//                   action: prop,
//                   args,
//                   mode: "scheduled",
//                   context: {
//                     context: context,
//                   },
//                 },
//               });

//               return scheduleId;
//             };
//           },
//         });
//       };
//     };

//     const eventListeners = new EventListener();
//     const healthCheck = this.createHealthChecker(instanceIdentifier);
//     healthCheck.onHealthCheckFailed(() => {
//       eventListeners.notify("error", new InstanceStalledError());
//     });

//     const createRemoteMethodHandler = (mode: InstanceMethodCall["mode"]) => {
//       return (action: string) => {
//         return async (...args: any[]) => {
//           const eventId = await sendRPC({
//             timestamp: Date.now(),
//             action,
//             args,
//             mode,
//             context: {
//               context: context,
//             }
//           });

//           if (mode === "skip") return true;
//           if (mode === "scheduled") return true;

//           if (mode === "normal") {
//             return new Promise((resolve, reject) => {
//               const internalStream = new ClientStream();
//               const scope = {
//                 response: undefined as any,
//               };

//               const isDoneWaitingForResponse = () => {
//                 internalStream.close();
//                 scope.response?.unsubscribe();
//               };

//               healthCheck.onHealthCheckFailed(() => {
//                 isDoneWaitingForResponse();

//                 if (this.client.config.throwOnStalledInstance) {
//                   const error = new InstanceStalledError();
//                   internalStream.error(error);
//                   reject(error);
//                 }
//               });

//               internalStream.on("end", () => {
//                 isDoneWaitingForResponse();
//               });

//               const handleStreamMessage = (message: InstanceEventStreamMessage) => {
//                 resolve(internalStream);
//                 internalStream.forward(message);
//               };

//               const handleDefaultMessage = (message: InternalMessageData) => {
//                 isDoneWaitingForResponse();

//                 if ("error" in message) {
//                   const error = RemoteError.deserialize(message.error);
//                   reject(error);
//                   return;
//                 }

//                 if ("response" in message) {
//                   resolve(message.response);
//                   return;
//                 }
//               };

//               const channel = this.client.getChannelForEventResponse(eventId);
//               scope.response = this.client.adapters.messages.subscribe<InternalMessageData>(
//                 instanceIdentifier,
//                 channel,
//                 (message) => {
//                   if ("stream" in message.data) return handleStreamMessage(message.data);
//                   if ("response" in message.data) return handleDefaultMessage(message.data);
//                   if ("error" in message.data) return handleDefaultMessage(message.data);
//                 },
//               );
//             });
//           }

//           throw new Error("Not Implemented");
//         };
//       };
//     };

//     const scheduleRemoteMethodHandler = createScheduledMethodHandler();
//     const normalRemoteMethodHandler = createRemoteMethodHandler("normal");
//     const skipRemoteMethodHandler = createRemoteMethodHandler("skip");

//     const instanceClientAPI = {
//       id: instanceId,
//       kind: kind,

//       async emit<Channel extends Extract<keyof InstanceChannels, string>>(
//         channel: Channel,
//         message: InstanceChannels[Channel],
//       ) {
//         await skipRemoteMethodHandler("emit")(channel, message);
//         return true;
//       },

//       dispose: () => {
//         healthCheck.dispose();
//         eventListeners.clear();
//       },

//       on: <Channel extends Extract<keyof InstanceChannels, string>>(
//         channel: Channel,
//         callback: (data: InstanceChannels[Channel]) => any,
//       ) => {
//         const callbackEmitter = eventListeners.on(channel, callback);

//         const subscribe = this.client.adapters.messages.subscribe<InstanceChannels[Channel]>(
//           instanceIdentifier,
//           Client.getChannelForEventBus("instance", channel.toString()),
//           (message) => {
//             healthCheck.reset();
//             callbackEmitter.notify(message.data);
//           },
//         );

//         const dispose = () => {
//           subscribe.unsubscribe();
//           callbackEmitter.unsubscribe();
//         };

//         return {
//           unsubscribe: () => {
//             dispose();
//           },
//         };
//       },

//       data: data,

//       __INTERNAL__: {
//         sendRPC,
//         wakeUpInstance: () => this.tryWakeInstanceUp(kind, instanceId),
//       },

//       schedule: scheduleRemoteMethodHandler,
//       scheduled: {
//         list: async () => {
//           return this.client.adapters.events.list(kind, instanceId);
//         },
//         cancel: async (scheduleId: ScheduleId) => {
//           return this.client.adapters.events.cancel(kind, instanceId, scheduleId);
//         },
//         delete: async (scheduleId: ScheduleId) => {
//           return this.client.adapters.events.delete(kind, instanceId, scheduleId);
//         },
//         get: async (scheduleId: ScheduleId) => {
//           return this.client.adapters.events.get(kind, instanceId, scheduleId);
//         },
//       },
//     } as const;

//     // We use the Kind type here just o it to show nicely
//     // in the intelissense. it will show as Remote<OrderBook> for example
//     type Spawn<Kind> = RemoteMethodes & typeof instanceClientAPI;

//     return new Proxy(instanceClientAPI, {
//       get(target, prop, receiver) {
//         if (prop in target) return Reflect.get(target, prop, receiver);
//         if (typeof prop !== "string") return;
//         return normalRemoteMethodHandler(prop);
//       },
//     }) as Spawn<Inst>;
//   }

// }


// // Utility Types:

// type ExtractMethodNames<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
// }[keyof T];

// type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

// type MakeRemote<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any
//   ? // If the function is sychronouse, we want to cast the return to a Promise
//   // And it it's already a promise, it's gonna stay a promise.
//   (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
//   : never;
// };

// type MakeSkippable<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any
//   ? (...args: Parameters<T[K]>) => Promise<boolean>
//   : never;
// };

// type MakeSchedulable<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any
//   ? (...args: Parameters<T[K]>) => Promise<ScheduleId>
//   : never;
// };
