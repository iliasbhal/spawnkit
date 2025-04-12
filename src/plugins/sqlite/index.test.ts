import * as Spawnkit from "../../../src";
import { SQLite } from ".";
import { nanoid } from 'nanoid';

export class SQLiteExample extends Spawnkit.Instance {

  sqlite = new SQLite({
    // volume: 
    // name: 'test',
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

    return 'DONE'
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

  it('should be able to download and upload', async () => {
    const remoteSqlite = client.spawn('SQLiteExample', nanoid());

    const taskId = nanoid();

    // remoteSqlite.schedule({
    //   name: 'test',
    //   cron: '*/1 * * * *',
    // })

    const result = await remoteSqlite.query('task', taskId);

    // console.log('done')
  });
});