import { InstancePlugin } from "../_common";
import { Scheduler } from "../scheduler";

export class Warmer extends InstancePlugin {
  schedule = new Scheduler();

  setup() {
    this.instance.hooks.initialize.push(async () => {
      await this.ensureSchedule();
    });
  }

  async ensureSchedule() {
    const schedules = await this.schedule.list();
    const hasWarmerAlreadyScheduled = schedules.some(schedule => {
      return schedule.config.event.action === '__INTERNAL__.WARMER';
    });

    if (!hasWarmerAlreadyScheduled) {
      this.schedule.cron('*/1 * * * *')['utils.ping']();
    }
  }
}

