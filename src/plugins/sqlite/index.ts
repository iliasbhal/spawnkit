import sqlite3 from 'sqlite3'
import { InstancePlugin } from '../_common'
import fs from 'fs-extra';
import { Volume } from '../volume';
import { MockVolume } from '../volume/mock';
import path from 'path';
interface SQLiteConfig {
  name?: string;
}

const DEFAULT_CONFIG: Required<SQLiteConfig> = {
  name: 'default'
}

export class SQLite extends InstancePlugin {
  db: sqlite3.Database;
  sqliteConfig: Required<SQLiteConfig>;

  volume: Volume;

  constructor(config?: SQLiteConfig) {
    super();

    const dbName = config?.name || DEFAULT_CONFIG.name;
    this.volume = new MockVolume({
      name: 'sqlite/' + dbName
    });
  }

  async setup() {
    this.instance.hooks.dispose.push(async () => {
      await this.db.close();
    });

    super.setup();
    this.instance.hooks.initialize.push(async () => {
      await this.startSqliteDatabase();
    });
  }

  async query(strings: TemplateStringsArray, ...values: any[]) {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
      result += values[i] + strings[i + 1];
    }

    try {
      return await this.db.exec(result);
    } catch (error) {
      console.error('error', error);
      throw error;
    }
  }

  private async startSqliteDatabase() {
    console.log('startSqliteDatabase', await this.volume.getPath());
    const volumePath = await this.volume.getPath();
    const relative = path.relative(__dirname, volumePath);

    const dbPath = path.resolve(volumePath, 'dump.db');
    console.log('dbPath', dbPath);
    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      console.log('DONE OPENING DB', err);
    });
  }
}