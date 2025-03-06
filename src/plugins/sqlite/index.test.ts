import * as Spawnkit from "../../../src";
import { SQLite } from ".";
import { baseRedisAdapters } from "../../../src/adapters/redis/base";
import { nanoid } from 'nanoid';

export class SQLiteExample extends Spawnkit.Instance {

  sqlite = new SQLite({
    name: 'test',
  });


  async query(name: string, content: string) {
    this.sqlite.query`
      CREATE TABLE IF NOT EXISTS ${name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
      );
    `;

    this.sqlite.query`
      INSERT INTO ${name} (content) VALUES ("${content}")
    `;
  }
}

const client = Spawnkit.Client.from({
  adapters: baseRedisAdapters,
  instances: {
    SQLiteExample,
  },
});


describe('SQLiteExample', () => {
  client.start();

  it('should be able to download and upload', async () => {
    const remoteSqlite = client.spawn('SQLiteExample', 'test');
    const uuid = nanoid();

    try {
      await remoteSqlite.query('task', uuid);
    } catch (error) {
      console.error('error', error);
    }

  });
});