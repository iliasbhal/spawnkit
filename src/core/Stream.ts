import { ControlledPromise } from "@/utils/ControlledPromise";
import { EventListener } from "@/utils/EventListenener";

type StreamBuilder<StreamValue> = (stream: Stream<StreamValue>) => any;

interface CallbackByEvent<StreamValue> {
	start: () => any;
	data: (data: StreamValue) => any;
	end: () => any;
	error: (err: Error) => any;
}

export class Stream<StreamValue> {
	abortCtl = new AbortController();
	callback: StreamBuilder<StreamValue>;

	eventListener = new EventListener<CallbackByEvent<StreamValue>>();

	constructor(callback: StreamBuilder<StreamValue>) {
		this.callback = callback;
	}

	on<EV extends keyof CallbackByEvent<StreamValue>>(event: EV, callback: CallbackByEvent<StreamValue>[EV]) {
		// @ts-ignore
		this.eventListener.on(event, callback);
	}

	stored: any[] = [];
	protected store(event: any, data?: any) {
		if (this.started) {
			this.unstore();
			this.notify(event, data);
			return;
		}

		this.stored.push({ event, data });
	}

	unstore() {
		if (this.stored.length) {
			this.stored.splice(0).forEach(({ event, data }) => {
				this.notify(event, data);
			});
		}
	}

	async map(callback: (data: StreamValue) => any) {
		// console.log("this closed", this.closed);
		if (this.closed) return Promise.resolve();

		return await new Promise((resolve, reject) => {
			this.on("end", () => resolve(true));
			this.on("error", (err) => reject(err));
			this.on("data", (data) => callback(data));

			this.unstore();
		});
	}

	createIterator() {
		const stream = this;

		// The iterator should be able to Buffer the incoming messages
		// and deliver them in order
		return async function* () {
			if (stream.closed) return;

			const incomingData: StreamValue[] = [];
			let promiseCtl = new ControlledPromise();

			stream.on("error", (err) => {
				promiseCtl.reject(err);
			});

			stream.on("data", (data) => {
				incomingData.push(data);
				promiseCtl.resolve(true);
				promiseCtl = new ControlledPromise();
			});

			stream.on("end", () => {
				promiseCtl.resolve(true);
			});

			Promise.resolve().then(() => {
				stream.unstore();
			});

			while (!stream.closed) {
				await promiseCtl.await;
				const dataToYield = incomingData.splice(0);
				yield* dataToYield;
			}
		};
	}

	[Symbol.asyncIterator] = this.createIterator();

	notify<EV extends keyof CallbackByEvent<StreamValue>>(
		event: EV,
		data?: Parameters<CallbackByEvent<StreamValue>[EV]>[0] extends never
			? never
			: Parameters<CallbackByEvent<StreamValue>[EV]>[0],
	) {
		if (this.closed) return;
		if (event === "end") this.closed = true;
		if (event === "start") this.started = true;

		// @ts-ignore
		this.eventListener.notify(event, data);
	}

	clear() {
		this.eventListener.clear();
	}

	async ensureStarted() {
		// if (this.started === false) {
		//   await this.start();
		// }
	}

	started = false;
	async start() {
		try {
			this.notify("start");
			await this.callback(this);
		} catch (err) {
			if (err instanceof Error) {
				this.error(err);
			}
		} finally {
			this.close();
		}
	}

	emit(data: StreamValue) {
		this.store("data", data);
	}

	error(err: Error) {
		this.store("error", err);
		this.store("end");
	}

	closed: boolean = false;
	close() {
		this.store("end");
	}
}
