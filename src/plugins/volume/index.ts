import path from 'path'
import fs from 'fs-extra'
import { VolumeFileSystem } from './VolumeFileSystem';
import { InstancePlugin } from '../InstancePlugin'

export interface VolumeConfig {
  path?: string;
  lazy?: boolean;
}

// Define a type for the fs interface
type FsInterface = {
  [K in keyof typeof fs]?: K extends 'constants'
  ? typeof fs.constants
  : Function;
};

export class Volume extends InstancePlugin {
  static TmpDirPath = path.resolve(__dirname, 'tmp');

  config: VolumeConfig;
  private fileSystem = new VolumeFileSystem();

  constructor(config: VolumeConfig) {
    super();
    this.config = config;
  }

  /**
   * Get the fs-extra interface with paths relative to the volume root
   */
  get fs(): FsInterface {
    const handler = {
      get: (target: FsInterface, prop: keyof FsInterface) => {
        if (prop === 'constants') {
          return target[prop];
        }
        if (typeof target[prop] === 'function') {
          return async (...args: any[]) => {
            await this.ensureDownloaded();
            return target[prop]!(...args);
          };
        }
        return target[prop];
      }
    };
    return new Proxy(this.fileSystem.fs, handler);
  }

  private ensureDownloadedPromise: Promise<void> | null = null;
  public async ensureDownloaded() {
    if (!this.ensureDownloadedPromise) {
      this.ensureDownloadedPromise = this.download();
    }

    return await this.ensureDownloadedPromise;
  }

  async getInstancePath() {
    const instancePath = `${this.instance.kind}:${this.instance.id}`;
    const pluginPath = this.config.path || 'default';
    const volumePath = path.resolve(instancePath, 'volumes', pluginPath);
    return volumePath;
  }

  async getPath() {
    const instancePath = await this.getInstancePath();
    const fullPath = path.resolve(Volume.TmpDirPath, instancePath);
    await fs.ensureDir(fullPath);
    return fullPath;
  }

  async setup() {
    const rootPath = await this.getPath();
    this.fileSystem.setRootPath(rootPath);

    this.instance.hooks.initialize.push(async () => {
      try {
        await this.ensureDownloaded();
      } catch (error) {
        await this.cleanup();
        throw error;
      }
    });

    this.instance.hooks.dispose.push(async () => {
      try {
        await this.upload();
      } catch (error) {
        await this.cleanup();
        throw error;
      }
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