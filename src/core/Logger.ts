import { Adapters, InstanceIdentifier, InstanceLog } from "../adapters/_common";

export class Logger {
	adapter: Adapters;
	ownerId!: string;
	instance!: InstanceIdentifier;

	constructor(config: { adapter: Adapters; ownerId: string; instance: InstanceIdentifier }) {
		this.instance = config.instance;
		this.ownerId = config.ownerId;
	}

	log(log: InstanceLog) {
		// console.log('log', log);
	}
}
