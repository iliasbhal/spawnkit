import { Volume, VolumeConfig } from ".";
import fs from 'fs-extra';
import path from 'path';

export class LocalVolume extends Volume {
  static RootDir = path.resolve(__dirname, 'local');

  constructor(config: VolumeConfig) {
    super(config);
  }

  async getMockPath() {
    const instancePath = await this.getInstancePath();
    const mockPath = path.resolve(LocalVolume.RootDir, instancePath);
    await fs.ensureDir(mockPath);
    return mockPath;
  }

  async download(): Promise<void> {
    const originalPath = await this.getMockPath();
    const content = await fs.readdir(originalPath);
    if (!content.length) {
      // It's empty, no need to download
      return;
    }

    const volumePath = await this.getPath();
    await fs.copy(originalPath, volumePath, {
      overwrite: true,
    });
  }

  async upload(): Promise<void> {
    const originalPath = await this.getMockPath();
    const volumePath = await this.getPath();
    await fs.copy(volumePath, originalPath, {
      overwrite: true,
    });
  }
}
