# React Native Big Media Loader

A high-performance React Native library for handling large media files efficiently. This library provides native file handling capabilities that work without forcing multi-GB buffers into JavaScript memory, while still allowing you to read arbitrary chunks when needed.

## Features

- **Efficient Large File Handling**: Open and manage large media files without loading them entirely into JavaScript memory
- **Native Media Picker**: Built-in media picker for images and videos using native pickers
- **Chunked Reading**: Read arbitrary portions of files efficiently with Base64 encoding (bridge-friendly)
- **Native Media Player Support**: Get native URIs that can be passed directly to media players like `react-native-video`
- **Cross-Platform**: Works on both iOS and Android with optimized native implementations
- **TurboModule Support**: Built with React Native's new architecture in mind
- **Memory Efficient**: Designed to handle multi-GB files without memory issues

## Installation

### 1. Install the package

```bash
npm install react-native-big-media-loader
# or
yarn add react-native-big-media-loader
```

### 2. Autolinking Setup

This library supports React Native autolinking (React Native 0.60+). The library will be automatically linked, but you'll need to install the native dependencies.

#### iOS
- The library will be automatically linked via CocoaPods
- **Required**: Run `cd ios && pod install` to install the native dependencies
- This step is always required after installing any React Native library with native code

#### Android
- The library will be automatically linked
- No additional configuration required

#### Installation Steps:
```bash
# 1. Install the package
yarn add react-native-big-media-loader
# or
npm install react-native-big-media-loader

# 2. For iOS - Install pods (required)
cd ios && pod install

# 3. Clean and rebuild (recommended)
# iOS: cd ios && xcodebuild clean
# Android: cd android && ./gradlew clean

# 4. Restart Metro bundler
npx react-native start --reset-cache
# or
yarn start --reset-cache
```

### 3. Manual Linking (if needed)

If autolinking doesn't work or you're using an older React Native version:

#### iOS Manual Setup
Add this to your `ios/Podfile`:

```ruby
pod 'react-native-big-media-loader', :path => '../node_modules/react-native-big-media-loader'
```

Then run:
```bash
cd ios && pod install
```

#### Android Manual Setup
Add this to your `android/settings.gradle`:

```gradle
include ':react-native-big-media-loader'
project(':react-native-big-media-loader').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-big-media-loader/android')
```

And this to your `android/app/build.gradle`:

```gradle
dependencies {
    implementation project(':react-native-big-media-loader')
}
```

And this to your `MainApplication.java`:

```java
import com.yourorg.bigmedialoader.BigMediaLoaderPackage;

// In getPackages() method:
packages.add(new BigMediaLoaderPackage());
```

## Usage

### Basic Usage

```typescript
import { BigMediaLoader } from 'react-native-big-media-loader';

// Open a file (returns a handle)
const handle = BigMediaLoader.open('file:///path/to/your/media/file.mp4');

// Get file statistics
const stats = BigMediaLoader.stat(handle);
console.log('File size:', stats.size);
console.log('MIME type:', stats.mime);
console.log('File name:', stats.name);

// Read a chunk of the file
const chunk = BigMediaLoader.readBase64(handle, 0, 1024 * 1024); // Read first 1MB
console.log('Bytes read:', chunk.bytesRead);
console.log('Is EOF:', chunk.eof);

// Get a URI for media players
const playableUri = BigMediaLoader.playableUri(handle);

// Close the file when done
BigMediaLoader.close(handle);
```

### Media Picker Usage

```typescript
import { BigMediaLoader } from 'react-native-big-media-loader';

// Pick images
const imageResult = await BigMediaLoader.pickImage({
  multiple: true,
  maxCount: 5
});

if (!imageResult.canceled) {
  console.log('Selected images:', imageResult.assets);
}

// Pick videos
const videoResult = await BigMediaLoader.pickVideo({
  multiple: false
});

if (!videoResult.canceled && videoResult.assets.length > 0) {
  const asset = videoResult.assets[0];
  const handle = BigMediaLoader.open(asset.uri);
  const stats = BigMediaLoader.stat(handle);
  console.log('Video size:', stats.size);
}

// Pick any media
const mediaResult = await BigMediaLoader.pickMedia({
  multiple: true,
  mediaType: 'all'
});
```

### Integration with Media Players

```typescript
import Video from 'react-native-video';
import { BigMediaLoader } from 'react-native-big-media-loader';

const handle = BigMediaLoader.open(fileUri);
const playableUri = BigMediaLoader.playableUri(handle);

// Use with react-native-video
<Video
  source={{ uri: playableUri }}
  style={{ width: 300, height: 200 }}
  controls
/>
```

### Chunked Upload Example

```typescript
import { BigMediaLoader } from 'react-native-big-media-loader';
import { Buffer } from 'buffer';

const uploadFileInChunks = async (fileUri: string, uploadFunction: (chunk: Buffer, offset: number) => Promise<void>) => {
  const handle = BigMediaLoader.open(fileUri);
  const stats = BigMediaLoader.stat(handle);
  
  let offset = 0;
  const chunkSize = 4 * 1024 * 1024; // 4MB chunks
  
  while (offset < stats.size) {
    const { base64, bytesRead, eof } = BigMediaLoader.readBase64(handle, offset, chunkSize);
    const buffer = Buffer.from(base64, 'base64');
    
    await uploadFunction(buffer, offset);
    offset += bytesRead;
    
    if (eof) break;
  }
  
  BigMediaLoader.close(handle);
};
```

## API Reference

### `BigMediaLoader.open(uri: string): number`

Opens a file and returns a numeric handle that you can reuse for subsequent operations.

- **Parameters:**
  - `uri`: File URI (use SAF URIs on Android: `content://...`, or `file://` paths on iOS)
- **Returns:** Numeric handle for the opened file
- **Throws:** Error if file cannot be opened

### `BigMediaLoader.stat(handle: number): MediaStats`

Returns file statistics and metadata.

- **Parameters:**
  - `handle`: File handle returned by `open()`
- **Returns:** `MediaStats` object with:
  - `size`: File size in bytes
  - `mime`: MIME type (may be null)
  - `name`: File name (may be null)
  - `uri`: Original file URI

### `BigMediaLoader.readBase64(handle: number, offset: number, length: number): ChunkResult`

Reads a chunk of the file and returns it as Base64-encoded data.

- **Parameters:**
  - `handle`: File handle returned by `open()`
  - `offset`: Starting position in bytes
  - `length`: Number of bytes to read
- **Returns:** Object with:
  - `offset`: Actual offset where reading started
  - `bytesRead`: Number of bytes actually read
  - `eof`: Whether end of file was reached
  - `base64`: Base64-encoded chunk data

### `BigMediaLoader.playableUri(handle: number): string`

Returns a URI that can be passed to native media players.

- **Parameters:**
  - `handle`: File handle returned by `open()`
- **Returns:** URI string suitable for media players

### `BigMediaLoader.close(handle: number): void`

Closes the file and releases associated resources.

- **Parameters:**
  - `handle`: File handle returned by `open()`

### `BigMediaLoader.pickImage(options?: MediaPickerOptions): Promise<MediaPickerResult>`

Opens the native image picker.

- **Parameters:**
  - `options`: Optional configuration object
    - `multiple`: Allow multiple image selection (default: false)
    - `maxCount`: Maximum number of images to select (default: 10)
    - `quality`: Image quality (0.0 to 1.0, default: 1.0)
    - `includeBase64`: Include base64 data (default: false)
- **Returns:** Promise with selected image assets

### `BigMediaLoader.pickVideo(options?: MediaPickerOptions): Promise<MediaPickerResult>`

Opens the native video picker.

- **Parameters:**
  - `options`: Optional configuration object
    - `multiple`: Allow multiple video selection (default: false)
    - `maxCount`: Maximum number of videos to select (default: 10)
    - `quality`: Video quality (0.0 to 1.0, default: 1.0)
    - `includeBase64`: Include base64 data (default: false)
- **Returns:** Promise with selected video assets

### `BigMediaLoader.pickMedia(options?: MediaPickerOptions): Promise<MediaPickerResult>`

Opens the native media picker for both images and videos.

- **Parameters:**
  - `options`: Optional configuration object
    - `multiple`: Allow multiple media selection (default: false)
    - `maxCount`: Maximum number of media files to select (default: 10)
    - `quality`: Media quality (0.0 to 1.0, default: 1.0)
    - `includeBase64`: Include base64 data (default: false)
    - `mediaType`: Filter by media type ('image', 'video', or 'all', default: 'all')
- **Returns:** Promise with selected media assets

## TypeScript Types

```typescript
export type MediaStats = {
  size: number;    // bytes
  mime: string | null;
  name: string | null;
  uri: string;
};

export type ChunkResult = {
  offset: number;
  bytesRead: number;
  eof: boolean;
  base64: string;
};

export interface MediaPickerOptions {
  multiple?: boolean;
  maxCount?: number;
  quality?: number;
  includeBase64?: boolean;
  mediaType?: 'image' | 'video' | 'all';
}

export interface MediaAsset {
  uri: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  width?: number;
  height?: number;
  duration?: number;
  base64?: string;
}

export interface MediaPickerResult {
  assets: MediaAsset[];
  canceled: boolean;
}
```

## Performance Considerations

### Why Base64?

The library uses Base64 encoding for chunk data because it's the simplest bridge-friendly format. While this adds some overhead, it's suitable for "small operational reads" like:

- Computing file hashes
- Reading file headers
- Verifying file segments
- Small metadata operations

### For Maximum Performance

If you need maximum performance for large-scale operations:

1. **Use native streaming**: Keep your native uploader unchanged and pass the original URI or handle ID
2. **Consider JSI**: For zero-copy operations, you can upgrade to JSI-backed ArrayBuffer (future enhancement)
3. **Batch operations**: Read larger chunks when possible to reduce bridge calls

### Memory Management

- Always call `close()` when you're done with a file handle
- The library automatically manages native file handles and memory
- Large files are streamed natively without loading into JavaScript memory

## Platform-Specific Notes

### Android

- Uses Storage Access Framework (SAF) for file access
- Supports `content://` URIs from document pickers
- Automatically handles file permissions
- Returns original URIs for media players

### iOS

- Supports `file://` paths
- Can be extended to support security-scoped bookmarks
- Returns file paths for media players

## Example App

See the `example/` directory for a complete demonstration app that shows:

- File picking with `react-native-document-picker`
- Reading file chunks and displaying hex previews
- Integration with `react-native-video`
- Proper cleanup and error handling

## Troubleshooting

### Common Issues

1. **File not found errors**: Ensure you're using the correct URI format for your platform
2. **Permission errors**: On Android, make sure you have proper file access permissions
3. **Memory issues**: Always close file handles when done

### Debugging

Enable React Native debugging to see detailed error messages from the native modules.

### Troubleshooting Autolinking

If autolinking doesn't work:

1. **Check React Native version**: Ensure you're using React Native 0.60+
2. **Clean and rebuild**:
   ```bash
   # iOS
   cd ios && rm -rf Pods && pod install
   
   # Android
   cd android && ./gradlew clean
   ```
3. **Reset Metro cache**:
   ```bash
   npx react-native start --reset-cache
   ```
4. **Check react-native.config.js**: Ensure the configuration is correct
5. **Manual linking**: Use the manual linking instructions above

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] JSI support for zero-copy ArrayBuffer operations
- [ ] Progress events for long operations
- [ ] File hashing utilities
- [ ] Thumbnail generation
- [ ] Cancelation support
- [ ] Unit and integration tests
- [ ] Performance benchmarks
