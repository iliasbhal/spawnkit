import { InstancePlugin } from '../_common'
import path from 'path'

interface FileConfig {
  name: string;
}

interface RemoteFile {
  download: () => Promise<void>;
  upload: () => Promise<void>;
}

export class File extends InstancePlugin implements RemoteFile {
  config: FileConfig;

  constructor(config: FileConfig) {
    super();
    this.config = config;
  }

  getFilePath() {
    const dirPath = path.resolve(__dirname, 'tmp');
    const fileName = `${this.instance.kind}:${this.instance.id}/files/${this.config.name}`;
    const filePath = path.resolve(dirPath, fileName);
    return filePath;
  }

  async setup() {
    this.instance.hooks.initialize.push(async () => {
      await this.download();
    });

    this.instance.hooks.dispose.push(async () => {
      await this.upload();
    });
  }

  async download() {
    // Download file from remote
  }

  async upload() {
    const filePath = this.getFilePath();
    // Upload file to remote
  }
}