import { Volume, VolumeConfig } from ".";
import fs from 'fs-extra';
import path from 'path';

export class MockVolume extends Volume {
  static MockDirPath = path.resolve(__dirname, 'mock');

  async getMockPath() {
    const instancePath = await this.getInstancePath();
    const mockPath = path.resolve(MockVolume.MockDirPath, instancePath);
    await fs.ensureDir(mockPath);
    return mockPath;
  }

  async download(): Promise<void> {
    console.log('DOWNALOD');
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
    console.log('DOWNLOADED END');
  }

  async upload(): Promise<void> {
    console.log('UPLOAD');
    const originalPath = await this.getMockPath();
    const volumePath = await this.getPath();
    await fs.copy(volumePath, originalPath, {
      overwrite: true,
    });
    console.log('UPLOADED END', originalPath);
  }
}
