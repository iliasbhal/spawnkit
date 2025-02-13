import sqlite3 from 'sqlite3'
import fs from 'fs-extra';
import { File } from '../file';

interface SQLiteConfig {
  name?: string;
}

const DEFAULT_CONFIG: Required<SQLiteConfig> = {
  name: 'default'
}

export class SQLite extends File {
  db: sqlite3.Database;
  config: Required<SQLiteConfig>;

  constructor(config?: SQLiteConfig) {
    const dbFilename = `${config?.name || DEFAULT_CONFIG.name}.db`;

    super({
      name: dbFilename
    });
  }

  async setup() {
    this.instance.hooks.initialize.push(async () => {
      await this.startSqliteDatabase();
    });
  }

  query(strings: TemplateStringsArray, ...values: any[]) {

  }

  private async startSqliteDatabase() {
    const filePath = this.getFilePath();
    await fs.ensureFile(filePath);
    this.db = new sqlite3.Database(filePath);
  }
}