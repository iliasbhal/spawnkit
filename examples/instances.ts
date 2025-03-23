import * as Spawnkit from "../src";
import type { Client } from './client'

class RequestMiddleware {

}

export class Tenant extends Spawnkit.Instance {
  client = new Spawnkit.Plugins.Client<Client['instances']>()



  doSomething() {
    const tenantBg = this.client.spawn('TenantBackgroundQueue', 'asd')
    tenantBg.sendEmail('test@test.com')
  }

}

export class TenantBackgroundQueue extends Spawnkit.Instance {
  sendEmail(email: string) {
    console.log('sendEmail', email)
    return true
  }
}

const aaa = {} as Client