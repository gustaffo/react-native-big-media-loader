import { BigMediaLoader, MediaStats } from './index';
import { Buffer } from 'buffer';

export interface ChunkedReadOptions {
  chunkSize?: number;
  onProgress?: (offset: number, totalSize: number) => void;
  onChunk?: (chunk: Buffer, offset: number) => void;
}

export interface UploadOptions extends ChunkedReadOptions {
  uploadFunction: (chunk: Buffer, offset: number) => Promise<void>;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Read a file in chunks and process each chunk
 */
export const readFileInChunks = async (
  handle: number,
  options: ChunkedReadOptions = {}
): Promise<void> => {
  const { chunkSize = 4 * 1024 * 1024, onProgress, onChunk } = options;
  const stats = BigMediaLoader.stat(handle);
  
  let offset = 0;
  
  while (offset < stats.size) {
    const { base64, bytesRead, eof } = BigMediaLoader.readBase64(handle, offset, chunkSize);
    const buffer = Buffer.from(base64, 'base64');
    
    if (onChunk) {
      await onChunk(buffer, offset);
    }
    
    if (onProgress) {
      onProgress(offset + bytesRead, stats.size);
    }
    
    offset += bytesRead;
    
    if (eof) break;
  }
};

/**
 * Upload a file in chunks with retry logic
 */
export const uploadFileInChunks = async (
  handle: number,
  options: UploadOptions
): Promise<void> => {
  const { uploadFunction, retryAttempts = 3, retryDelay = 1000, ...readOptions } = options;
  
  await readFileInChunks(handle, {
    ...readOptions,
    onChunk: async (chunk: Buffer, offset: number) => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < retryAttempts; attempt++) {
        try {
          await uploadFunction(chunk, offset);
          return; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          if (attempt < retryAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      throw lastError || new Error('Upload failed after all retry attempts');
    }
  });
};

/**
 * Calculate SHA-256 hash of a file
 */
export const calculateFileHash = async (handle: number): Promise<string> => {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  
  await readFileInChunks(handle, {
    onChunk: (chunk: Buffer) => {
      hash.update(chunk);
    }
  });
  
  return hash.digest('hex');
};

/**
 * Read file header (first N bytes) for format detection
 */
export const readFileHeader = (handle: number, headerSize: number = 1024): Buffer => {
  const { base64 } = BigMediaLoader.readBase64(handle, 0, headerSize);
  return Buffer.from(base64, 'base64');
};

/**
 * Detect file type from header
 */
export const detectFileType = (handle: number): string => {
  const header = readFileHeader(handle, 16);
  const hex = header.toString('hex').toLowerCase();
  
  // Common file signatures
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('47494638')) return 'image/gif';
  if (hex.startsWith('52494646') && hex.includes('41564920')) return 'video/avi';
  if (hex.startsWith('000001b3')) return 'video/mpeg';
  if (hex.startsWith('66747970')) return 'video/mp4';
  if (hex.startsWith('1a45dfa3')) return 'video/webm';
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (hex.startsWith('504b0304')) return 'application/zip';
  
  return 'application/octet-stream';
};

/**
 * Get file information with type detection
 */
export const getFileInfo = (handle: number): MediaStats & { detectedType: string } => {
  const stats = BigMediaLoader.stat(handle);
  const detectedType = detectFileType(handle);
  
  return {
    ...stats,
    detectedType
  };
};

/**
 * Create a file handle wrapper with automatic cleanup
 */
export class FileHandle {
  private handle: number;
  private closed = false;
  
  constructor(uri: string) {
    this.handle = BigMediaLoader.open(uri);
  }
  
  getHandle(): number {
    if (this.closed) {
      throw new Error('File handle is closed');
    }
    return this.handle;
  }
  
  stat(): MediaStats {
    return BigMediaLoader.stat(this.getHandle());
  }
  
  readChunk(offset: number, length: number) {
    return BigMediaLoader.readBase64(this.getHandle(), offset, length);
  }
  
  getPlayableUri(): string {
    return BigMediaLoader.playableUri(this.getHandle());
  }
  
  close(): void {
    if (!this.closed) {
      BigMediaLoader.close(this.handle);
      this.closed = true;
    }
  }
  
  // Auto-close when object is garbage collected
  [Symbol.dispose]() {
    this.close();
  }
}

/**
 * Utility function to safely use a file handle with automatic cleanup
 */
export const withFileHandle = async <T>(
  uri: string,
  operation: (handle: FileHandle) => Promise<T>
): Promise<T> => {
  const handle = new FileHandle(uri);
  try {
    return await operation(handle);
  } finally {
    handle.close();
  }
};

// MARK: - Media Picker Utilities

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

/**
 * Pick images with automatic file handling
 */
export const pickImagesWithHandles = async (
  options: MediaPickerOptions = {}
): Promise<{ assets: MediaAsset[]; handles: FileHandle[]; canceled: boolean }> => {
  const result = await BigMediaLoader.pickImage(options);
  
  if (result.canceled) {
    return { assets: [], handles: [], canceled: true };
  }
  
  const handles = result.assets.map(asset => new FileHandle(asset.uri));
  
  return {
    assets: result.assets,
    handles,
    canceled: false
  };
};

/**
 * Pick videos with automatic file handling
 */
export const pickVideosWithHandles = async (
  options: MediaPickerOptions = {}
): Promise<{ assets: MediaAsset[]; handles: FileHandle[]; canceled: boolean }> => {
  const result = await BigMediaLoader.pickVideo(options);
  
  if (result.canceled) {
    return { assets: [], handles: [], canceled: true };
  }
  
  const handles = result.assets.map(asset => new FileHandle(asset.uri));
  
  return {
    assets: result.assets,
    handles,
    canceled: false
  };
};

/**
 * Pick media with automatic file handling
 */
export const pickMediaWithHandles = async (
  options: MediaPickerOptions = {}
): Promise<{ assets: MediaAsset[]; handles: FileHandle[]; canceled: boolean }> => {
  const result = await BigMediaLoader.pickMedia(options);
  
  if (result.canceled) {
    return { assets: [], handles: [], canceled: true };
  }
  
  const handles = result.assets.map(asset => new FileHandle(asset.uri));
  
  return {
    assets: result.assets,
    handles,
    canceled: false
  };
};

/**
 * Process picked media files with automatic cleanup
 */
export const processPickedMedia = async <T>(
  pickerFunction: () => Promise<{ assets: MediaAsset[]; handles: FileHandle[]; canceled: boolean }>,
  processor: (assets: MediaAsset[], handles: FileHandle[]) => Promise<T>
): Promise<T | null> => {
  const { assets, handles, canceled } = await pickerFunction();
  
  if (canceled) {
    return null;
  }
  
  try {
    return await processor(assets, handles);
  } finally {
    // Clean up handles
    handles.forEach(handle => handle.close());
  }
};
