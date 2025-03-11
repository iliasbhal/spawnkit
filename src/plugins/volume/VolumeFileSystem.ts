import path from 'path'
import fs from 'fs-extra'
import type { Volume } from '.';

export interface VolumeConfig {
  name: string;
}

// Define a type for the fs interface
type FsInterface = {
  [K in keyof typeof fs]?: K extends 'constants'
  ? typeof fs.constants
  : Function;
};

/**
 * A class that wraps fs-extra to provide filesystem operations with paths relative to a root directory
 */
export class VolumeFileSystem {
  private volume: Volume;
  private fsInterface: FsInterface = {};
  private pathCache: { path: string; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  constructor(volume: Volume) {
    this.volume = volume;
    this.setupFsInterface();
  }

  private async getPathWithCache(): Promise<string> {
    const now = Date.now();
    // Use cached path if it exists and is still valid
    if (this.pathCache && (now - this.pathCache.timestamp) < this.CACHE_TTL) {
      return this.pathCache.path;
    }

    // Get fresh path and update cache
    const path = await this.volume.getPath();
    this.pathCache = { path, timestamp: now };
    return path;
  }

  private setupFsInterface() {
    // Methods that take multiple path arguments with their path argument indices
    const methodsWithPathArgs: Record<string, number[]> = {
      'copy': [0, 1],        // source, dest
      'copyFile': [0, 1],    // source, dest
      'link': [0, 1],        // existing, new
      'move': [0, 1],        // source, dest
      'rename': [0, 1],      // old, new
      'symlink': [0, 1],     // target, path
      // For all other methods, we assume the first argument is a path
    };

    // Create a wrapper for each fs-extra method that accepts a path
    const fsMethods = [
      'access', 'appendFile', 'chmod', 'chown', 'copy', 'copyFile', 'createFile',
      'emptyDir', 'ensureDir', 'ensureFile', 'ensureLink', 'ensureSymlink',
      'exists', 'lchown', 'link', 'lstat', 'mkdir', 'mkdirs', 'move', 'outputFile',
      'outputJson', 'pathExists', 'readdir', 'readFile', 'readJson', 'readlink',
      'realpath', 'remove', 'rename', 'rmdir', 'stat', 'symlink', 'truncate',
      'unlink', 'utimes', 'writeFile', 'writeJson'
    ];

    // Create a wrapper for each method
    for (const method of fsMethods) {
      this.fsInterface[method] = async (...args: any[]) => {
        // Create a local function-level cache to optimize for multiple path resolutions
        // in a single async operation execution
        let operationRootPath: string | null = null;

        const getRootPath = async () => {
          if (operationRootPath === null) {
            operationRootPath = await this.getPathWithCache();
          }
          return operationRootPath;
        };

        // Get path indices for this method, or default to [0] (first argument)
        const pathIndices = methodsWithPathArgs[method] || [0];

        // Resolve paths for all arguments that should be paths
        for (const index of pathIndices) {
          if (index < args.length && typeof args[index] === 'string') {
            const rootPath = await getRootPath();
            args[index] = path.resolve(rootPath, args[index]);
          }
        }

        return fs[method](...args);
      };
    }

    // Add fs.constants
    this.fsInterface.constants = fs.constants;
  }

  /**
   * Get the fs-extra interface with path resolution
   */
  get fs(): FsInterface {
    return this.fsInterface;
  }
}
