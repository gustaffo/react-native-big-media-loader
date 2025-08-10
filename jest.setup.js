// Mock React Native modules
jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    getEnforcing: jest.fn(() => ({
      open: jest.fn(),
      close: jest.fn(),
      stat: jest.fn(),
      readBase64: jest.fn(),
      playableUri: jest.fn(),
      pickImage: jest.fn(),
      pickVideo: jest.fn(),
      pickMedia: jest.fn(),
    })),
  },
  NativeModules: {
    BigMediaLoader: {
      open: jest.fn(),
      close: jest.fn(),
      stat: jest.fn(),
      readBase64: jest.fn(),
      playableUri: jest.fn(),
      pickImage: jest.fn(),
      pickVideo: jest.fn(),
      pickMedia: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

// Mock Buffer for Node.js environment
global.Buffer = require('buffer').Buffer;

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash'),
  })),
}));

// Setup global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
