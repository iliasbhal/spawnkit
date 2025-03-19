import { InstancePlugin } from '../_common'
import { SQLite } from '../sqlite';

// https://www.npmjs.com/package/keyv
// https://github.com/zaaack/keyv-file

interface SQLiteConfig {
  name?: string;
}

const DEFAULT_CONFIG: Required<SQLiteConfig> = {
  name: 'default'
}

export class KV extends InstancePlugin {
  sqlite: SQLite;


  constructor(config?: SQLiteConfig) {
    super();

    const dbName = config?.name || DEFAULT_CONFIG.name;
    this.sqlite = new SQLite({
      name: 'kv/' + dbName
    });
  }

  // async get(key: string) {
  //   return this.sqlite.get(key);
  // }

  // async set(key: string, value: any) {
  //   return this.sqlite.set(key, value);
  // }
}