import { BigMediaLoader, FileHandle, withFileHandle, uploadFileInChunks, calculateFileHash } from '../src/index';
import { Buffer } from 'buffer';

// Example 1: Basic file operations
export const basicFileOperations = async (fileUri: string) => {
  const handle = BigMediaLoader.open(fileUri);
  
  try {
    // Get file stats
    const stats = BigMediaLoader.stat(handle);
    console.log('File size:', stats.size);
    console.log('File name:', stats.name);
    
    // Read first 1KB
    const chunk = BigMediaLoader.readBase64(handle, 0, 1024);
    console.log('Read bytes:', chunk.bytesRead);
    
    // Get playable URI for media players
    const playableUri = BigMediaLoader.playableUri(handle);
    console.log('Playable URI:', playableUri);
  } finally {
    BigMediaLoader.close(handle);
  }
};

// Example 2: Using the FileHandle wrapper
export const usingFileHandle = async (fileUri: string) => {
  const handle = new FileHandle(fileUri);
  
  try {
    const stats = handle.stat();
    console.log('File size:', stats.size);
    
    // Read chunks
    const chunk1 = handle.readChunk(0, 1024);
    const chunk2 = handle.readChunk(1024, 1024);
    
    console.log('Chunk 1 bytes:', chunk1.bytesRead);
    console.log('Chunk 2 bytes:', chunk2.bytesRead);
  } finally {
    handle.close();
  }
};

// Example 3: Using withFileHandle for automatic cleanup
export const usingWithFileHandle = async (fileUri: string) => {
  const result = await withFileHandle(fileUri, async (handle) => {
    const stats = handle.stat();
    const chunk = handle.readChunk(0, 1024);
    
    return {
      size: stats.size,
      bytesRead: chunk.bytesRead
    };
  });
  
  console.log('Result:', result);
  // File is automatically closed
};

// Example 4: Chunked upload with progress
export const chunkedUploadExample = async (fileUri: string) => {
  const handle = BigMediaLoader.open(fileUri);
  
  try {
    await uploadFileInChunks(handle, {
      chunkSize: 1024 * 1024, // 1MB chunks
      retryAttempts: 3,
      retryDelay: 1000,
      onProgress: (offset, totalSize) => {
        const percentage = Math.round((offset / totalSize) * 100);
        console.log(`Upload progress: ${percentage}%`);
      },
      uploadFunction: async (chunk: Buffer, offset: number) => {
        // Simulate upload
        console.log(`Uploading chunk at offset ${offset}, size: ${chunk.length}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  } finally {
    BigMediaLoader.close(handle);
  }
};

// Example 5: File hashing
export const fileHashingExample = async (fileUri: string) => {
  const handle = BigMediaLoader.open(fileUri);
  
  try {
    const hash = await calculateFileHash(handle);
    console.log('File SHA-256 hash:', hash);
  } finally {
    BigMediaLoader.close(handle);
  }
};

// Example 6: Media player integration
export const mediaPlayerExample = async (fileUri: string) => {
  const handle = BigMediaLoader.open(fileUri);
  
  try {
    const stats = BigMediaLoader.stat(handle);
    const playableUri = BigMediaLoader.playableUri(handle);
    
    // Use with react-native-video
    const videoProps = {
      source: { uri: playableUri },
      style: { width: 300, height: 200 },
      controls: true,
      resizeMode: 'contain' as const
    };
    
    console.log('Video props:', videoProps);
    console.log('File type:', stats.mime);
  } finally {
    BigMediaLoader.close(handle);
  }
};

// Example 7: Reading specific file regions
export const readingFileRegions = async (fileUri: string) => {
  const handle = BigMediaLoader.open(fileUri);
  
  try {
    const stats = BigMediaLoader.stat(handle);
    
    // Read file header (first 1KB)
    const header = BigMediaLoader.readBase64(handle, 0, 1024);
    console.log('Header bytes:', header.bytesRead);
    
    // Read file footer (last 1KB)
    const footerOffset = Math.max(0, stats.size - 1024);
    const footer = BigMediaLoader.readBase64(handle, footerOffset, 1024);
    console.log('Footer bytes:', footer.bytesRead);
    
    // Read middle section
    const middleOffset = Math.floor(stats.size / 2);
    const middle = BigMediaLoader.readBase64(handle, middleOffset, 1024);
    console.log('Middle bytes:', middle.bytesRead);
  } finally {
    BigMediaLoader.close(handle);
  }
};

// Example 8: Error handling
export const errorHandlingExample = async (fileUri: string) => {
  try {
    const handle = BigMediaLoader.open(fileUri);
    
    try {
      const stats = BigMediaLoader.stat(handle);
      console.log('File opened successfully:', stats.name);
    } catch (error) {
      console.error('Error reading file stats:', error);
    } finally {
      BigMediaLoader.close(handle);
    }
  } catch (error) {
    console.error('Error opening file:', error);
  }
};

// Example 9: Batch processing multiple files
export const batchProcessingExample = async (fileUris: string[]) => {
  const results = [];
  
  for (const uri of fileUris) {
    try {
      const result = await withFileHandle(uri, async (handle) => {
        const stats = handle.stat();
        const hash = await calculateFileHash(handle.getHandle());
        
        return {
          uri,
          name: stats.name,
          size: stats.size,
          hash
        };
      });
      
      results.push(result);
    } catch (error) {
      console.error(`Error processing ${uri}:`, error);
      results.push({ uri, error: error.message });
    }
  }
  
  return results;
};
