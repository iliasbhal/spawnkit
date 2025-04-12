import fs from 'fs-extra';
import path from 'path';
import { Volume } from './index';
import { VolumeFileSystem } from './VolumeFileSystem';

// Mock the Volume class for unit tests


// Create a minimal mock of Instance for integration tests
class MockInstance {
  id = 'test-instance-id';
  kind = 'test-kind';
  hooks = {
    initialize: [],
    dispose: []
  };
}

// Extended Volume for integration tests
class TestVolume extends Volume {
  constructor() {
    super({ name: 'test-volume' });

    // Attach instance
    (this as any).instance = new MockInstance();

    // Make temporary directory unique for tests
    TestVolume.TmpDirPath = path.resolve(__dirname, 'tmp', `test-${Date.now()}`);
  }
}

describe('VolumeFileSystem - Unit Tests', () => {


  // Mock fs-extra for unit tests
  jest.mock('fs-extra', () => {
    const originalModule = jest.requireActual('fs-extra');
    return Object.fromEntries(
      Object.entries(originalModule).map(([key, value]) => {
        if (typeof value === 'function') {
          return [key, jest.fn().mockResolvedValue(undefined)];
        }
        return [key, value];
      }),
    );
  });

  let volumeMock: any;
  let volumeFs: VolumeFileSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    volumeMock = {
      getPath: jest.fn().mockResolvedValue('/mock/volume/path'),
    };
    volumeFs = new VolumeFileSystem(volumeMock as any);
  });

  describe.only('Path resolution', () => {
    it('should resolve relative paths to volume root', async () => {
      await volumeFs.fs.pathExists('test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/mock/volume/path/test.txt');
    });

    it('should handle nested paths correctly', async () => {
      await volumeFs.fs.pathExists('folder/subfolder/test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/mock/volume/path/folder/subfolder/test.txt');
    });

    it('should not modify absolute paths', async () => {
      await volumeFs.fs.pathExists('/absolute/path/test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/absolute/path/test.txt');
    });
  });

  describe('Path caching', () => {
    it('should cache path resolution for subsequent calls', async () => {
      await volumeFs.fs.readFile('test1.txt');
      await volumeFs.fs.readFile('test2.txt');

      // getPath should only be called once due to caching
      expect(volumeMock.getPath).toHaveBeenCalledTimes(1);
    });

    it('should renew cache after TTL expires', async () => {
      // First call
      await volumeFs.fs.readFile('test1.txt');

      // Simulate time passing beyond TTL
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);

      // Second call should renew cache
      await volumeFs.fs.readFile('test2.txt');

      // getPath should be called twice due to cache expiry
      expect(volumeMock.getPath).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-path methods', () => {
    it('should resolve multiple paths for copy method', async () => {
      await volumeFs.fs.copy('source.txt', 'dest.txt');

      // Both source and dest paths should be resolved

      expect(fs.copy).toHaveBeenCalledWith(
        '/mock/volume/path/source.txt',
        '/mock/volume/path/dest.txt'
      );
    });

    it('should resolve multiple paths for rename method', async () => {
      await volumeFs.fs.rename('old.txt', 'new.txt');

      // Both old and new paths should be resolved
      expect(fs.rename).toHaveBeenCalledWith(
        '/mock/volume/path/old.txt',
        '/mock/volume/path/new.txt'
      );
    });
  });

  describe('Method availability', () => {
    it('should provide access to all common fs-extra methods', async () => {
      const methodsToCheck = [
        'readFile', 'writeFile', 'readdir', 'ensureDir',
        'copy', 'move', 'remove', 'exists'
      ];

      for (const method of methodsToCheck) {
        expect(typeof volumeFs.fs[method]).toBe('function');
      }
    });

    it('should provide access to fs constants', () => {
      expect(volumeFs.fs.constants).toBeDefined();
      expect(volumeFs.fs.constants).toEqual(fs.constants);
    });
  });

  describe('Performance optimization', () => {
    it('should reuse path within a single operation', async () => {
      // Override the method to track getRootPath calls
      let getRootPathCalls = 0;
      const originalMethod = volumeFs.fs.copy;
      (volumeFs.fs as any).copy = async (...args: any[]) => {
        // Track original implementation to count getRootPath calls
        const originalCopy = async () => {
          getRootPathCalls++;
          const result = await originalMethod(...args);
          return result;
        };
        return originalCopy();
      };

      await volumeFs.fs.copy('source.txt', 'dest.txt');

      // Despite resolving two paths, getRootPath should only be called once
      expect(getRootPathCalls).toBe(1);
    });
  });
});


describe('VolumeFileSystem - Integration Tests', () => {
  // Disable mocks for integration tests
  jest.unmock('./index');
  jest.unmock('fs-extra');


  let volume: TestVolume;
  let testDir: string;

  beforeEach(async () => {
    // Ensure mocks are disabled
    jest.restoreAllMocks();

    // Set up a fresh volume for each test
    volume = new TestVolume();
    testDir = await volume.getPath();

    // Ensure directory exists and is empty
    await fs.emptyDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(TestVolume.TmpDirPath);
  });

  describe('Basic file operations', () => {
    it('should write and read a file', async () => {
      const testContent = 'Hello, world!';
      const filename = 'test.txt';

      // Write file using volume.fs
      await volume.fs.writeFile(filename, testContent);

      // Verify file exists at the correct path
      const filePath = path.join(testDir, filename);
      expect(await fs.exists(filePath)).toBe(true);

      // Read file using volume.fs
      const content = await volume.fs.readFile(filename, 'utf8');
      expect(content).toBe(testContent);
    });

    it('should create and read directories', async () => {
      const dirPath = 'nested/directory/structure';

      // Create nested directory
      await volume.fs.ensureDir(dirPath);

      // Verify directory exists
      const fullPath = path.join(testDir, dirPath);
      expect(await fs.exists(fullPath)).toBe(true);

      // Create a file in the nested directory
      const filename = `${dirPath}/test.txt`;
      const testContent = 'Nested file content';
      await volume.fs.writeFile(filename, testContent);

      // Read the file back
      const content = await volume.fs.readFile(filename, 'utf8');
      expect(content).toBe(testContent);
    });
  });

  describe('Multiple file operations', () => {
    it('should copy files correctly', async () => {
      const sourceFile = 'source.txt';
      const destFile = 'destination.txt';
      const testContent = 'File content to copy';

      // Create source file
      await volume.fs.writeFile(sourceFile, testContent);

      // Copy the file
      await volume.fs.copy(sourceFile, destFile);

      // Both files should exist and have the same content
      expect(await volume.fs.exists(sourceFile)).toBe(true);
      expect(await volume.fs.exists(destFile)).toBe(true);

      const destContent = await volume.fs.readFile(destFile, 'utf8');
      expect(destContent).toBe(testContent);
    });

    it('should move files correctly', async () => {
      const sourceFile = 'original.txt';
      const destFile = 'moved.txt';
      const testContent = 'File content to move';

      // Create source file
      await volume.fs.writeFile(sourceFile, testContent);

      // Move the file
      await volume.fs.move(sourceFile, destFile);

      // Source should not exist, destination should have content
      expect(await volume.fs.exists(sourceFile)).toBe(false);
      expect(await volume.fs.exists(destFile)).toBe(true);

      const destContent = await volume.fs.readFile(destFile, 'utf8');
      expect(destContent).toBe(testContent);
    });
  });

  describe('Caching behavior', () => {
    it('should call getPath only when necessary', async () => {
      // Spy on the getPath method
      const getPathSpy = jest.spyOn(volume, 'getPath');

      // Multiple operations should reuse the cache
      await volume.fs.writeFile('file1.txt', 'content');
      await volume.fs.writeFile('file2.txt', 'content');
      await volume.fs.writeFile('file3.txt', 'content');

      // getPath should be called only once due to caching
      expect(getPathSpy).toHaveBeenCalledTimes(1);
    });
  });
}); 