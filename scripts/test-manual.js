#!/usr/bin/env node

/**
 * Manual Test Script for React Native Big Media Loader
 * 
 * This script can be used to test the library functionality manually.
 * Run with: node scripts/test-manual.js
 */

const { BigMediaLoader } = require('../src/index');

// Mock React Native for Node.js environment
global.Buffer = require('buffer').Buffer;

// Simple test runner
class ManualTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running Manual Tests for React Native Big Media Loader\n');
    
    for (const test of this.tests) {
      try {
        console.log(`📋 Running: ${test.name}`);
        await test.testFn();
        console.log(`✅ PASSED: ${test.name}\n`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAILED: ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('📊 Test Summary:');
    console.log(`   Total: ${this.tests.length}`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Success Rate: ${Math.round((this.passed / this.tests.length) * 100)}%`);
  }
}

// Create test runner
const runner = new ManualTestRunner();

// Test 1: Basic module import
runner.test('Module Import', async () => {
  expect(BigMediaLoader).toBeDefined();
  expect(typeof BigMediaLoader.open).toBe('function');
  expect(typeof BigMediaLoader.close).toBe('function');
  expect(typeof BigMediaLoader.stat).toBe('function');
  expect(typeof BigMediaLoader.readBase64).toBe('function');
  expect(typeof BigMediaLoader.playableUri).toBe('function');
  expect(typeof BigMediaLoader.pickImage).toBe('function');
  expect(typeof BigMediaLoader.pickVideo).toBe('function');
  expect(typeof BigMediaLoader.pickMedia).toBe('function');
});

// Test 2: File operations (mocked)
runner.test('File Operations', async () => {
  // Mock the native module
  const mockHandle = 123;
  const mockStats = {
    size: 1024,
    mime: 'video/mp4',
    name: 'test.mp4',
    uri: 'file:///test/path/file.mp4'
  };

  // Mock the native methods
  BigMediaLoader.open = jest.fn().mockReturnValue(mockHandle);
  BigMediaLoader.stat = jest.fn().mockReturnValue(mockStats);
  BigMediaLoader.close = jest.fn();

  const handle = BigMediaLoader.open('file:///test/path/file.mp4');
  expect(handle).toBe(mockHandle);

  const stats = BigMediaLoader.stat(handle);
  expect(stats).toEqual(mockStats);

  BigMediaLoader.close(handle);
  expect(BigMediaLoader.close).toHaveBeenCalledWith(handle);
});

// Test 3: Media picker operations (mocked)
runner.test('Media Picker Operations', async () => {
  const mockResult = {
    assets: [
      {
        uri: 'file:///test/image.jpg',
        fileName: 'image.jpg',
        fileSize: 1024,
        type: 'image',
        width: 1920,
        height: 1080
      }
    ],
    canceled: false
  };

  // Mock the picker methods
  BigMediaLoader.pickImage = jest.fn().mockResolvedValue(mockResult);
  BigMediaLoader.pickVideo = jest.fn().mockResolvedValue(mockResult);
  BigMediaLoader.pickMedia = jest.fn().mockResolvedValue(mockResult);

  const imageResult = await BigMediaLoader.pickImage({ multiple: false });
  expect(imageResult).toEqual(mockResult);

  const videoResult = await BigMediaLoader.pickVideo({ multiple: false });
  expect(videoResult).toEqual(mockResult);

  const mediaResult = await BigMediaLoader.pickMedia({ mediaType: 'all' });
  expect(mediaResult).toEqual(mockResult);
});

// Test 4: Utility functions
runner.test('Utility Functions', async () => {
  const { FileHandle, withFileHandle } = require('../src/utils');

  // Mock BigMediaLoader for utils
  const mockHandle = 123;
  const mockStats = { size: 1024, mime: 'video/mp4', name: 'test.mp4', uri: 'file:///test/path/file.mp4' };

  BigMediaLoader.open = jest.fn().mockReturnValue(mockHandle);
  BigMediaLoader.stat = jest.fn().mockReturnValue(mockStats);
  BigMediaLoader.close = jest.fn();

  // Test FileHandle class
  const fileHandle = new FileHandle('file:///test/path/file.mp4');
  expect(fileHandle.getHandle()).toBe(mockHandle);

  const stats = fileHandle.stat();
  expect(stats).toEqual(mockStats);

  fileHandle.close();
  expect(BigMediaLoader.close).toHaveBeenCalledWith(mockHandle);

  // Test withFileHandle utility
  const result = await withFileHandle('file:///test/path/file.mp4', async (handle) => {
    return handle.stat();
  });

  expect(result).toEqual(mockStats);
  expect(BigMediaLoader.close).toHaveBeenCalledWith(mockHandle);
});

// Test 5: Error handling
runner.test('Error Handling', async () => {
  // Test file open error
  BigMediaLoader.open = jest.fn().mockImplementation(() => {
    throw new Error('File not found');
  });

  expect(() => {
    BigMediaLoader.open('invalid://uri');
  }).toThrow('File not found');

  // Test picker error
  BigMediaLoader.pickImage = jest.fn().mockRejectedValue(new Error('Picker failed'));

  await expect(BigMediaLoader.pickImage()).rejects.toThrow('Picker failed');
});

// Test 6: Chunked reading simulation
runner.test('Chunked Reading Simulation', async () => {
  const { readFileInChunks } = require('../src/utils');
  
  const mockHandle = 123;
  const mockStats = { size: 2048, mime: 'video/mp4', name: 'test.mp4', uri: 'file:///test/path/file.mp4' };

  BigMediaLoader.stat = jest.fn().mockReturnValue(mockStats);
  BigMediaLoader.readBase64 = jest.fn()
    .mockReturnValueOnce({ offset: 0, bytesRead: 1024, eof: false, base64: 'dGVzdA==' })
    .mockReturnValueOnce({ offset: 1024, bytesRead: 1024, eof: true, base64: 'ZGF0YQ==' });

  const chunks = [];
  const progress = [];

  await readFileInChunks(mockHandle, {
    chunkSize: 1024,
    onChunk: (chunk, offset) => {
      chunks.push({ chunk, offset });
    },
    onProgress: (offset, total) => {
      progress.push({ offset, total });
    }
  });

  expect(chunks).toHaveLength(2);
  expect(progress).toHaveLength(2);
  expect(BigMediaLoader.readBase64).toHaveBeenCalledTimes(2);
});

// Test 7: File type detection
runner.test('File Type Detection', async () => {
  const { detectFileType } = require('../src/utils');
  
  const mockHandle = 123;
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);

  BigMediaLoader.readBase64 = jest.fn().mockReturnValue({
    offset: 0,
    bytesRead: 16,
    eof: false,
    base64: jpegHeader.toString('base64')
  });

  const fileType = detectFileType(mockHandle);
  expect(fileType).toBe('image/jpeg');
});

// Test 8: Hash calculation
runner.test('Hash Calculation', async () => {
  const { calculateFileHash } = require('../src/utils');
  
  const mockHandle = 123;
  const mockStats = { size: 1024, mime: 'video/mp4', name: 'test.mp4', uri: 'file:///test/path/file.mp4' };

  BigMediaLoader.stat = jest.fn().mockReturnValue(mockStats);
  BigMediaLoader.readBase64 = jest.fn().mockReturnValue({
    offset: 0,
    bytesRead: 1024,
    eof: true,
    base64: 'dGVzdA=='
  });

  const hash = await calculateFileHash(mockHandle);
  expect(hash).toBe('mocked-hash');
});

// Simple assertion function
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeInstanceOf(constructor) {
      if (!(actual instanceof constructor)) {
        throw new Error(`Expected ${actual} to be instance of ${constructor.name}`);
      }
    },
    toHaveBeenCalledWith(...args) {
      if (!actual.mock) {
        throw new Error('Expected mock function');
      }
      const calls = actual.mock.calls;
      const found = calls.some(call => 
        call.length === args.length && 
        call.every((arg, index) => arg === args[index])
      );
      if (!found) {
        throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
      }
    },
    toHaveBeenCalledTimes(times) {
      if (!actual.mock) {
        throw new Error('Expected mock function');
      }
      if (actual.mock.calls.length !== times) {
        throw new Error(`Expected function to have been called ${times} times, but was called ${actual.mock.calls.length} times`);
      }
    },
    toThrow(message) {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (error) {
        if (message && error.message !== message) {
          throw new Error(`Expected error message "${message}", but got "${error.message}"`);
        }
      }
    },
    toHaveLength(length) {
      if (actual.length !== length) {
        throw new Error(`Expected array to have length ${length}, but got ${actual.length}`);
      }
    }
  };
}

// Mock jest.fn for Node.js environment
function jest() {
  return {
    fn() {
      const mockFn = function(...args) {
        mockFn.mock.calls.push(args);
        return mockFn.mockReturnValue;
      };
      mockFn.mock = {
        calls: [],
        returnValue: undefined
      };
      mockFn.mockReturnValue = function(value) {
        mockFn.mock.returnValue = value;
        return mockFn;
      };
      mockFn.mockResolvedValue = function(value) {
        mockFn.mock.returnValue = Promise.resolve(value);
        return mockFn;
      };
      mockFn.mockRejectedValue = function(value) {
        mockFn.mock.returnValue = Promise.reject(value);
        return mockFn;
      };
      mockFn.mockImplementation = function(impl) {
        mockFn.mock.implementation = impl;
        return mockFn;
      };
      return mockFn;
    }
  };
}

// Run the tests
runner.run().catch(console.error);
