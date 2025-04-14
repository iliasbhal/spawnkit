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

import path from 'path';
import { VolumeFileSystem } from './VolumeFileSystem';
import fs from 'fs-extra';
// Mock the Volume class for unit tests

describe('VolumeFileSystem - Unit Tests', () => {


  // Mock fs-extra for unit tests

  beforeEach(() => {
    jest.clearAllMocks();
  });


  describe('Path resolution', () => {

    it('should resolve relative paths to volume root for files', async () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      await volumeFs.fs.pathExists('test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/mock/volume/path/test.txt');
    });

    it('should handle nested paths correctly for files', async () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      await volumeFs.fs.pathExists('folder/subfolder/test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/mock/volume/path/folder/subfolder/test.txt');
    });

    it('should not modify absolute paths for files', async () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      await volumeFs.fs.pathExists('/absolute/path/test.txt');
      expect(fs.pathExists).toHaveBeenCalledWith('/absolute/path/test.txt');
    });
  });

  describe('Multi-path methods', () => {
    it('should resolve multiple paths for copy method', async () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      await volumeFs.fs.copy('source.txt', 'dest.txt');

      // Both source and dest paths should be resolved

      expect(fs.copy).toHaveBeenCalledWith(
        '/mock/volume/path/source.txt',
        '/mock/volume/path/dest.txt'
      );
    });

    it('should resolve multiple paths for rename method', async () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
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
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      const methodsToCheck = [
        'readFile', 'writeFile', 'readdir', 'ensureDir',
        'copy', 'move', 'remove', 'exists'
      ];

      for (const method of methodsToCheck) {
        expect(typeof volumeFs.fs[method]).toBe('function');
      }
    });

    it('should provide access to fs constants', () => {
      const volumeFs = new VolumeFileSystem('/mock/volume/path');
      expect(volumeFs.fs.constants).toBeDefined();
      expect(volumeFs.fs.constants).toEqual(fs.constants);
    });
  });
});

