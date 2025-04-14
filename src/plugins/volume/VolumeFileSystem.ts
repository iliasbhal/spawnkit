import path from 'path'
import fs from 'fs-extra'

export interface VolumeConfig {
  name: string;
}

// Define a type for the fs interface
type FsInterface = {
  [K in keyof typeof fs]: K extends 'constants'
  ? typeof fs.constants
  : Function;
};

/**
 * A class that wraps fs-extra to provide filesystem operations with paths relative to a root directory
 */
export class VolumeFileSystem {
  private rootPath: string;
  private fsInterface: FsInterface = {} as any;

  constructor(rootPath?: string) {
    this.rootPath = rootPath || '/';
    this.setupFsInterface();
  }

  setRootPath(rootPath: string) {
    this.rootPath = rootPath;
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

    const patchMethodArgs = (method, args) => {
      // Get path indices for this method, or default to [0] (first argument)
      const pathIndices = methodsWithPathArgs[method] || [0];
      const nextArgs = [...args];

      // Resolve paths for all arguments that should be paths
      for (const index of pathIndices) {
        if (index < args.length && typeof args[index] === 'string') {
          nextArgs[index] = path.resolve(this.rootPath, args[index]);
        }
      }

      return nextArgs;
    }

    // Create a wrapper for each method
    for (const method of fsMethods) {
      this.fsInterface[method] = async (...args: any[]) => {
        // Get path indices for this method, or default to [0] (first argument)
        const nextArgs = patchMethodArgs(method, args)
        return fs[method](...nextArgs);
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
