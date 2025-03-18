import { Instance } from "@/core";
import { InstancePlugin } from "../_common";

export class Scheduler<Inst extends Instance> extends InstancePlugin {
  getInstanceClient() {
    const { kind, id, api } = this.instance;
    return api.client.createInstanceClient<Inst>(kind, id, {})
  }

  cron(cronExpression: string) {
    const client = this.getInstanceClient();
    return client.schedule({
      name: 'test',
      cron: cronExpression,
    });
  }

  delay(delay: number) {
    const client = this.getInstanceClient();
    return client.schedule({
      name: 'test',
      delay: delay,
    });
  }

  list() {
    const client = this.getInstanceClient();
    return client.scheduled.list();
  }

  cancel(scheduleId: string) {
    const client = this.getInstanceClient();
    return client.scheduled.cancel(scheduleId);
  }
}

