import * as Spawnkit from "../../../src";
import { nanoid } from 'nanoid';

export class SQLiteExample extends Spawnkit.Instance {
  volume = new Spawnkit.Plugins.Volume({
    path: '/test',
    lazy: true,
  });

  sqlite = new Spawnkit.Plugins.SQLite({
    // volume: this.volume,
    initialize: async (db) => {
      await db.pragma('journal_mode = WAL');
    }
  });

  async sql(strings: TemplateStringsArray, ...values: any[]) {
    const parsed = this.parseQuery(strings, ...values);
    return this.sqlite.prepare(parsed.sqlQuery);
  }


  private parseQuery(strings: TemplateStringsArray, ...values: any[]) {
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

}

const client = Spawnkit.Client.from({
  adapter: new Spawnkit.Adapters.InMemoryAdapter(),
  instances: {
    SQLiteExample,
  },
});


describe.skip('SQLiteExample', () => {
  client.start();

  it('should be able to run queries against the database', async () => {
    const remoteSqlite = client.spawn('SQLiteExample', nanoid());

    const result = await remoteSqlite.sql`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
      );
    `;


  });

  it('should only download the database when the first query is made', async () => {
    const remoteSqlite = client.spawn('SQLiteExample', nanoid());

    const taskId = nanoid();

    const result = await remoteSqlite.query('task', taskId);

    console.log('done')
  })
});