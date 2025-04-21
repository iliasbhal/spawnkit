import SQLite3 from 'better-sqlite3'
import path from 'path';
import { InstancePlugin } from '../InstancePlugin'
import { Volume } from '../volume';
import { AsyncQueue } from '../../utils/AsyncQueue';

interface SQLiteConfig {
  volume?: Volume;
  initialize?: (db: SQLite3.Database) => Promise<void> | void;
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
    this.volume?.hooks.dispose.unshift(async () => {
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

  private ensureInitializedPromise: () => Promise<void> | null = null;
  private async ensureDatabaseInitialized() {
    if (!this.ensureInitializedPromise) {
      this.ensureInitializedPromise = async () => {
        await this.volume?.ensureDownloaded();
        await this.startSqliteDatabase()
      }
    }

    return await this.ensureInitializedPromise();
  }

  withInit<T extends keyof SQLite3.Database>(attribute: T): SQLite3.Database[T] {
    if (typeof this.db?.[attribute] === 'function') {
      return async (...args: any[]) => {
        await this.ensureDatabaseInitialized();
        return this.db?.[attribute](...args);
      }
    }

    return this.db?.[attribute];
  }

  get client() { return this.db }

  get aggregate() { return this.withInit('aggregate') }
  get backup() { return this.withInit('backup') }
  get close() { return this.withInit('close') }
  get defaultSafeIntegers() { return this.withInit('defaultSafeIntegers') }
  get exec() { return this.withInit('exec') }
  get function() { return this.withInit('function') }
  get inTransaction() { return this.withInit('inTransaction') }
  get loadExtension() { return this.withInit('loadExtension') }
  get memory() { return this.withInit('memory') }
  get name() { return this.withInit('name') }
  get open() { return this.withInit('open') }
  get pragma() { return this.withInit('pragma') }
  get prepare() { return this.withInit('prepare') }
  get readonly() { return this.withInit('readonly') }
  get serialize() { return this.withInit('serialize') }
  get table() { return this.withInit('table') }
  get transaction() { return this.withInit('transaction') }
  get unsafeMode() { return this.withInit('unsafeMode') }

  private syncQueue: AsyncQueue = new AsyncQueue();

  /**
   * This will sync the volume 
   * and keeps the instance awake while it's uploading
   */
  async persist() {
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
    const dbPath = await this.getSQLitePath();
    this.db = new SQLite3(dbPath, {
      fileMustExist: true,
    });

    await this.config.initialize?.(this.db);
  }
}