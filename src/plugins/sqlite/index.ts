import sqlite3 from 'sqlite3'
import path from 'path';
import { InstancePlugin } from '../_common'
import { Volume } from '../volume';
import { MockVolume } from '../volume/mock';
import { AsyncQueue } from '../../utils/AsyncQueue';

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

    // Ensure the db is closed when the instance is disposed
    // So that the volume is uploaded with a clean state
    this.instance.hooks.dispose.push(async () => {
      await this.db.close();
    });

    super.setup();

    this.instance.hooks.initialize.push(async () => {
      await this.startSqliteDatabase();
    });
  }

  parseQuery(strings: TemplateStringsArray, ...values: any[]) {
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      query += value + strings[i + 1];
    }

    const sqlQuery = query.trim();
    const isRead = sqlQuery.toUpperCase().startsWith('SELECT');
    return {
      sqlQuery,
      isRead,
      isWrite: !isRead,
    };
  }

  async query(strings: TemplateStringsArray, ...values: any[]) {
    const parsed = this.parseQuery(strings, ...values);

    const result = await this.db.exec(parsed.sqlQuery);
    if (parsed.isWrite) {
      this.syncVolume();
    }
    return result;
  }


  private syncQueue: AsyncQueue = new AsyncQueue();

  /**
   * This will sync the volume 
   * and keeps the instance awake while it's uploading
   */
  private async syncVolume() {
    const willAlreadySync = this.syncQueue.waitingCount >= 1;
    if (willAlreadySync) {
      return;
    }

    this.syncQueue.enqueue(async () => {
      return await this.instance.waitFor(async () => {
        return await this.volume.upload();
      });
    });
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