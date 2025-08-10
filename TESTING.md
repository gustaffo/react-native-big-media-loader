# Testing Guide for React Native Big Media Loader

This guide explains how to test the React Native Big Media Loader library using different testing approaches.

## 🧪 Testing Overview

The library includes multiple types of tests:

1. **Unit Tests** - Test individual functions and components
2. **Integration Tests** - Test complete workflows and interactions
3. **Manual Tests** - Test functionality in a real environment
4. **E2E Tests** - Test the complete app with the library

## 📋 Prerequisites

Before running tests, make sure you have the following installed:

```bash
# Install dependencies
npm install

# Install testing dependencies (if not already installed)
npm install --save-dev jest @types/jest react-native-testing-library @testing-library/jest-native react-test-renderer ts-jest metro-react-native-babel-preset
```

## 🚀 Running Tests

### 1. Unit Tests

Run all unit tests:

```bash
npm run test:unit
```

Run specific unit test files:

```bash
# Test the main module
npm test -- __tests__/unit/BigMediaLoader.test.ts

# Test utility functions
npm test -- __tests__/unit/utils.test.ts
```

### 2. Integration Tests

Run integration tests:

```bash
npm run test:integration
```

Run specific integration test files:

```bash
npm test -- __tests__/integration/media-picker-integration.test.ts
```

### 3. All Tests

Run all tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

### 4. Manual Tests

Run manual tests in Node.js environment:

```bash
node scripts/test-manual.js
```

## 📁 Test Structure

```
__tests__/
├── unit/
│   ├── BigMediaLoader.test.ts    # Main module tests
│   └── utils.test.ts             # Utility function tests
├── integration/
│   └── media-picker-integration.test.ts  # Integration tests
└── e2e/                          # End-to-end tests (future)
```

## 🧩 Test Categories

### Unit Tests

Unit tests focus on testing individual functions and components in isolation:

- **BigMediaLoader.test.ts**: Tests the main module's API
- **utils.test.ts**: Tests utility functions and helper classes

#### Example Unit Test:

```typescript
describe('BigMediaLoader', () => {
  it('should open a file and return handle', () => {
    const mockHandle = 123;
    const testUri = 'file:///test/path/file.mp4';
    
    mockTurboModule.open.mockReturnValue(mockHandle);
    
    const handle = BigMediaLoader.open(testUri);
    
    expect(mockTurboModule.open).toHaveBeenCalledWith(testUri);
    expect(handle).toBe(mockHandle);
  });
});
```

### Integration Tests

Integration tests verify that different parts of the library work together correctly:

- **Complete workflows**: From media picking to file processing
- **Error handling**: How the library handles various error scenarios
- **Resource management**: Proper cleanup and memory management

#### Example Integration Test:

```typescript
describe('Complete Image Picker Flow', () => {
  it('should handle complete image picking and processing flow', async () => {
    // Mock picker result
    const mockPickerResult = {
      assets: [/* ... */],
      canceled: false
    };

    // Execute the complete flow
    const result = await pickImagesWithHandles({
      multiple: true,
      maxCount: 5
    });

    // Verify the entire workflow
    expect(result.assets).toEqual(mockPickerResult.assets);
    expect(result.handles).toHaveLength(2);
  });
});
```

### Manual Tests

Manual tests run in a Node.js environment and test the library's JavaScript functionality:

```bash
node scripts/test-manual.js
```

These tests verify:
- Module imports and exports
- Function signatures
- Basic functionality with mocked native modules
- Error handling scenarios

## 🔧 Test Configuration

### Jest Configuration

The library uses a custom Jest configuration (`jest.config.js`):

```javascript
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  // ... more configuration
};
```

### Mock Setup

The library includes comprehensive mocks in `jest.setup.js`:

- React Native modules
- TurboModule registry
- Native modules
- Crypto functions
- Buffer support

## 📊 Test Coverage

Run tests with coverage to see how well the code is tested:

```bash
npm run test:coverage
```

This will generate:
- Console coverage report
- HTML coverage report in `coverage/` directory
- LCOV coverage report

### Coverage Targets

The library aims for:
- **Lines**: >90%
- **Functions**: >95%
- **Branches**: >85%
- **Statements**: >90%

## 🐛 Debugging Tests

### Debug Unit Tests

To debug unit tests, you can use:

```bash
# Run tests with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand __tests__/unit/BigMediaLoader.test.ts

# Or use Jest's debug mode
npm test -- --verbose --no-coverage __tests__/unit/BigMediaLoader.test.ts
```

### Debug Integration Tests

For integration tests:

```bash
# Run with detailed logging
npm test -- --verbose --no-coverage __tests__/integration/media-picker-integration.test.ts
```

### Debug Manual Tests

For manual tests:

```bash
# Run with Node.js debugger
node --inspect-brk scripts/test-manual.js
```

## 🔍 Testing Specific Features

### Testing Media Picker

```bash
# Test image picker functionality
npm test -- --testNamePattern="pickImage"

# Test video picker functionality
npm test -- --testNamePattern="pickVideo"

# Test media picker functionality
npm test -- --testNamePattern="pickMedia"
```

### Testing File Operations

```bash
# Test file opening and closing
npm test -- --testNamePattern="File Operations"

# Test chunked reading
npm test -- --testNamePattern="readFileInChunks"

# Test file hashing
npm test -- --testNamePattern="calculateFileHash"
```

### Testing Error Handling

```bash
# Test error scenarios
npm test -- --testNamePattern="Error Handling"
```

## 🧪 Writing New Tests

### Adding Unit Tests

1. Create a new test file in `__tests__/unit/`
2. Import the functions you want to test
3. Mock dependencies using Jest
4. Write test cases

Example:

```typescript
import { BigMediaLoader } from '../../src/index';

describe('New Feature', () => {
  it('should work correctly', () => {
    // Arrange
    const mockResult = { /* ... */ };
    mockTurboModule.newMethod.mockReturnValue(mockResult);
    
    // Act
    const result = BigMediaLoader.newMethod();
    
    // Assert
    expect(result).toEqual(mockResult);
  });
});
```

### Adding Integration Tests

1. Create a new test file in `__tests__/integration/`
2. Test complete workflows
3. Mock native modules appropriately
4. Test error scenarios

### Adding Manual Tests

1. Add test cases to `scripts/test-manual.js`
2. Use the `runner.test()` function
3. Mock dependencies as needed

## 🚨 Common Issues

### Mock Issues

If you encounter mock-related issues:

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose logging
npm test -- --verbose
```

### TypeScript Issues

If you encounter TypeScript errors:

```bash
# Check TypeScript compilation
npm run build

# Run tests with type checking disabled
npm test -- --no-typecheck
```

### Native Module Issues

For native module testing issues:

1. Ensure mocks are properly set up in `jest.setup.js`
2. Check that native module methods are mocked correctly
3. Verify that the module is imported correctly

## 📈 Continuous Integration

The library is set up to run tests in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    npm run lint
```

## 🔄 Test Maintenance

### Updating Tests

When adding new features:

1. Add unit tests for new functions
2. Add integration tests for new workflows
3. Update manual tests if needed
4. Update mocks if new native modules are added

### Test Review

Before merging changes:

1. Ensure all tests pass
2. Check test coverage hasn't decreased
3. Verify new features are properly tested
4. Review integration tests for completeness

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
- [TurboModule Testing](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules#testing)

## 🤝 Contributing Tests

When contributing to the library:

1. Write tests for new features
2. Ensure existing tests still pass
3. Add integration tests for complex workflows
4. Update documentation if needed
5. Follow the existing test patterns and conventions
