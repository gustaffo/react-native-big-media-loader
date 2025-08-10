# Quick Test Guide

This is a quick start guide to test the React Native Big Media Loader library.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run All Tests

```bash
npm test
```

### 3. Run Tests with Coverage

```bash
npm run test:coverage
```

### 4. Run Manual Tests

```bash
node scripts/test-manual.js
```

### 5. Test Autolinking Configuration

```bash
npm run test:autolinking
```

## 📋 Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run only integration tests |
| `node scripts/test-manual.js` | Run manual tests |
| `npm run test:autolinking` | Test autolinking configuration |

## 🧪 What's Tested

### Unit Tests
- ✅ File operations (open, close, stat, readBase64, playableUri)
- ✅ Media picker operations (pickImage, pickVideo, pickMedia)
- ✅ Error handling scenarios
- ✅ Utility functions (FileHandle, withFileHandle, etc.)

### Integration Tests
- ✅ Complete media picker workflows
- ✅ File processing with automatic cleanup
- ✅ Upload scenarios with chunked reading
- ✅ Error handling in complex scenarios

### Manual Tests
- ✅ Module imports and exports
- ✅ Function signatures
- ✅ Basic functionality with mocked native modules

## 📊 Expected Results

When you run the tests, you should see:

```
✅ All tests passing
📊 Coverage > 90%
🧪 Manual tests successful
```

## 🔧 Troubleshooting

### If tests fail:

1. **Clear Jest cache:**
   ```bash
   npm test -- --clearCache
   ```

2. **Check dependencies:**
   ```bash
   npm install
   ```

3. **Run with verbose output:**
   ```bash
   npm test -- --verbose
   ```

### Common Issues:

- **TypeScript errors**: Run `npm run build` first
- **Mock issues**: Check `jest.setup.js` configuration
- **Native module errors**: Ensure mocks are properly set up

## 🎯 Test Focus Areas

The tests cover these key areas:

1. **Core Functionality**
   - File opening and closing
   - File statistics and metadata
   - Chunked reading operations
   - Media player URI generation

2. **Media Picker**
   - Image picker functionality
   - Video picker functionality
   - Mixed media picker
   - Multiple selection support

3. **Utility Functions**
   - FileHandle class lifecycle
   - Automatic resource cleanup
   - Chunked upload scenarios
   - File type detection
   - Hash calculation

4. **Error Handling**
   - File not found scenarios
   - Picker cancellation
   - Network errors during upload
   - Invalid file operations

## 📈 Coverage Goals

The library aims for:
- **Lines**: >90%
- **Functions**: >95%
- **Branches**: >85%
- **Statements**: >90%

## 🚀 Next Steps

After running tests successfully:

1. **Check coverage report** in `coverage/` directory
2. **Review failing tests** if any
3. **Add new tests** for any missing functionality
4. **Update tests** when adding new features

## 📚 More Information

For detailed testing information, see [TESTING.md](./TESTING.md)
