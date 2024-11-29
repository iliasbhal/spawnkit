import { InstancePlugin } from '../_common'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs-extra';

export class SQLite extends InstancePlugin {
  db: sqlite3.Database;

  async setup() {
    await this.startSqliteDatabase();
    await this.ensureDatabaseReady();
  }

  query(strings: TemplateStringsArray, ...values: any[]) {

  }

  private async startSqliteDatabase() {
    const dirPath = path.resolve(__dirname, 'tmp');
    const filePath = path.resolve(dirPath, this.instance.kind + ':' + this.instance.id + '.db');

    await fs.ensureDir(dirPath);
    await fs.ensureFile(filePath);

    this.db = new sqlite3.Database(filePath);
    return this.db;
  }

  private ensureDatabaseReady() {
    this.instance.hooks.initialize.push(() => {
      // Download sqlite data
    });

    this.instance.hooks.dispose.push(() => {
      // Upload Sqlite data
    });
  }
}