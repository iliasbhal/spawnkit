import { Adapters, InstanceIdentifier, InstanceLog } from "../adapters";

export class Logger {
	adapters: Adapters;
	ownerId!: string;
	instance!: InstanceIdentifier;

	constructor(config: { adapters: Adapters; ownerId: string; instance: InstanceIdentifier }) {
		this.adapters = config.adapters;
		this.instance = config.instance;
		this.ownerId = config.ownerId;
	}

	log(log: InstanceLog) {
		this.adapters.logger?.log(this.instance, this.ownerId, log);
	}
}
