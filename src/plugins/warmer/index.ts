import { InstancePlugin } from "../_common";
import { Scheduler } from "../scheduler";
import { Instance } from "../../core/Instance";


interface WarmerConfig {
  id?: string
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

    const STAY_ALIVE_FOR_45_MINUTES = 1000 * 60 * 45;
    const EVERY_30_MINUTES = '*/30 * * * *';
    inst.schedule({ cron: EVERY_30_MINUTES, id: scheduleId })[`utils.stayLiveFor`](STAY_ALIVE_FOR_45_MINUTES);
  }
}
