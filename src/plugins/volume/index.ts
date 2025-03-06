import { InstancePlugin } from '../_common'
import path from 'path'
import fs from 'fs-extra'

export interface VolumeConfig {
  name: string;
}

export class Volume extends InstancePlugin {
  static TmpDirPath = path.resolve(__dirname, 'tmp');

  config: VolumeConfig;

  constructor(config: VolumeConfig) {
    super();
    this.config = config;
  }

  async getInstancePath() {
    const volumePath = `${this.instance.kind}:${this.instance.id}/volumes/${this.config.name}`;
    return volumePath;
  }

  async getPath() {
    const instancePath = await this.getInstancePath();
    const fullPath = path.resolve(Volume.TmpDirPath, instancePath);
    await fs.ensureDir(fullPath);
    return fullPath;
  }

  async setup() {
    this.instance.hooks.initialize.push(async () => {
      try {
        await this.download();
      } catch (error) {
        await this.cleanup();
        throw error;
      }
    });

    this.instance.hooks.dispose.push(async () => {
      await this.upload();
      await this.cleanup();
    });
  }

  async download() { }
  async upload() { }

  /**
   * Remove the volume from the local disk
   * This is called when the instance is disposed
   * or when the download fails
   */
  private async cleanup() {
    const volumePath = await this.getPath();
    await fs.remove(volumePath);

    let currentPath = path.resolve(volumePath, '..');
    while (true) {
      if (currentPath === Volume.TmpDirPath) {
        break;
      }

      const files = await fs.readdir(currentPath);
      if (files.length > 0) {
        break;
      }

      await fs.remove(currentPath);
      currentPath = path.resolve(currentPath, '..');
    }
  }
}