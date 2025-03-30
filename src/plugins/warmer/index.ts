import { InstancePlugin } from "../_common";
import { Scheduler } from "../scheduler";
import { Instance } from "../../core/Instance";


interface WarmerConfig {
  id?: string;

  stayAliveFor: number;
  cron: string;
}

export class Warmer extends InstancePlugin {
  config: WarmerConfig
  schedule = new Scheduler();

  constructor(config: WarmerConfig) {
    super();
    this.config = config;
  }

  setup() {
    this.instance.hooks.initialize.push(async () => {
      await this.ensureSchedule();
    });
  }

  async ensureSchedule() {
    const client = this.instance.api.client;
    const { kind, id } = this.instance;
    const inst = client.createInstanceClient<Instance>(kind, id, {});


    const scheduleId = this.config.id ?? `warmer-default`;
    const scheduledCron = await inst.scheduled.get(scheduleId);
    const hasWarmerAlreadyScheduled = !!scheduledCron;
    if (hasWarmerAlreadyScheduled) return;

    inst.schedule({ cron: this.config.cron, id: scheduleId })[`utils.stayLiveFor`](this.config.stayAliveFor);
  }
}
