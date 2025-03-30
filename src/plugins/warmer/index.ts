import { InstancePlugin } from "../_common";
import { Scheduler } from "../scheduler";
import { Instance } from "../../core/Instance";


interface WarmerConfig {
  id?: string;

  stayAliveFor?: number;
  cron?: string;
}

export class Warmer extends InstancePlugin {
  config: WarmerConfig
  schedule = new Scheduler();

  constructor(config: WarmerConfig) {
    super();
    this.config = config;

    this.config.id = this.config.id ?? `warmer-default`;
  }

  setup() {
    this.instance.hooks.initialize.push(async () => {
      await this.tryScheduleWarmer();
    });
  }

  async setConfig(config: WarmerConfig) {
    this.config = Object.assign(this.config, config);
    await this.tryScheduleWarmer();
  }

  async tryScheduleWarmer() {
    if (!this.config.cron || !this.config.stayAliveFor) {
      return;
    }

    const client = this.instance.api.client;
    const { kind, id } = this.instance;
    const inst = client.createInstanceClient<Instance>(kind, id, {});


    const scheduleId = this.config.id;
    const scheduledCron = await inst.scheduled.get(scheduleId);
    const hasWarmerAlreadyScheduled = !!scheduledCron;
    if (hasWarmerAlreadyScheduled) return;

    await inst.scheduled.delete(scheduleId);
    await inst.schedule({ cron: this.config.cron, id: scheduleId })[`utils.stayLiveFor`](this.config.stayAliveFor);
  }
}
