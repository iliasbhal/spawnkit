import * as SQLite3 from 'sqlite3'
import path from 'path';
import { InstancePlugin } from '../InstancePlugin'
import { Volume } from '../volume';
import { AsyncQueue } from '../../utils/AsyncQueue';

interface SQLiteConfig {
  volume?: Volume;
  inMemoryPersistence?: boolean;
}

const IN_MEMORY_DB_PATH = ":memory:";

export class SQLite extends InstancePlugin {
  db: SQLite3.Database;
  sqliteConfig: Required<SQLiteConfig>;

  volume: Volume;
  config: SQLiteConfig;

  constructor(config?: SQLiteConfig) {
    super();
    this.config = config;
    this.volume = config?.volume;
  }

  async setup() {
    const isInMemory = await this.isInMemory();
    if (isInMemory) {
      this.setupInMemory();
      return;
    }

    this.setupPersistent();
  }

  private setupInMemory() {
    // console.log('setupInMemory')
    this.hooks.initialize.push(async () => {
      // console.log('sqlite before started')
      await this.startSqliteDatabase();
      // console.log('sqlite started')
    });

    this.hooks.dispose.push(async () => {
      await this.db.close();
    });

    // console.log('setupInMemory done')
  }

  private setupPersistent() {
    this.volume.hooks.initialize.push(async () => {
      await this.startSqliteDatabase();
    });

    // Ensure the db is closed when the instance is disposed
    // So that the volume is uploaded with a clean state
    this.volume.hooks.dispose.unshift(async () => {
      await this.db.close();
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

    const isInMemory = await this.isInMemory();
    if (isInMemory) {
      return;
    }

    this.syncQueue.enqueue(async () => {
      return await this.instance.waitFor(async () => {
        return await this.volume.upload();
      });
    });
  }

  async isInMemory() {
    const dbPath = await this.getSQLitePath();
    const isInMemory = dbPath === IN_MEMORY_DB_PATH;
    return isInMemory;
  }

  private dbPath: string;
  private async getSQLitePath() {
    if (!this.volume) {
      return IN_MEMORY_DB_PATH
    }

    const volumePath = await this.volume.getPath();
    this.dbPath = path.resolve(volumePath, 'dump.db');
    return this.dbPath;
  }

  private async startSqliteDatabase() {
    // console.log('startSqliteDatabase')
    this.db = await new Promise(async (resolve, reject) => {
      const mode = SQLite3.OPEN_READWRITE | SQLite3.OPEN_CREATE;
      const dbPath = await this.getSQLitePath();
      const db = new SQLite3.Database(dbPath, mode, (err) => {
        // console.log('DONE OPENING DB', err);
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }
}