import fs from 'fs-extra';
import path from 'path';

import * as Spawnkit from "../..";
import { LocalVolume } from "./LocalVolume";
import { nanoid } from 'nanoid';

export class VolumeExample extends Spawnkit.Instance {

  volume = new LocalVolume({
    name: 'test',
  });


  async writeFile(name: string, content: string) {
    const volumePath = await this.volume.getPath();
    const filePath = path.resolve(volumePath, name);
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async listFiles() {
    const volumePath = await this.volume.getPath();
    const files = await fs.readdir(volumePath);
    return files.map(file => path.resolve(volumePath, file));
  }
}

const client = Spawnkit.Client.from({
  adapter: new Spawnkit.Adapters.InMemoryAdapter(),
  instances: {
    VolumeExample,
  },
});


describe('LocalVolume', () => {
  client.start();

  it('should be able to download and upload', async () => {
    const volume = client.spawn('VolumeExample', 'test');
    const uuid = nanoid();
    const filePath = await volume.writeFile(`${uuid}.txt`, 'test');
    expect(filePath).toBeDefined();
    expect(filePath).toContain(uuid);

    const files = await volume.listFiles();
    // console.log('files', files);
    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
    expect(files.includes(filePath)).toBe(true);
  });
});