import { MediaStats } from './index';
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
export declare const readFileInChunks: (handle: number, options?: ChunkedReadOptions) => Promise<void>;
/**
 * Upload a file in chunks with retry logic
 */
export declare const uploadFileInChunks: (handle: number, options: UploadOptions) => Promise<void>;
/**
 * Calculate SHA-256 hash of a file
 */
export declare const calculateFileHash: (handle: number) => Promise<string>;
/**
 * Read file header (first N bytes) for format detection
 */
export declare const readFileHeader: (handle: number, headerSize?: number) => Buffer;
/**
 * Detect file type from header
 */
export declare const detectFileType: (handle: number) => string;
/**
 * Get file information with type detection
 */
export declare const getFileInfo: (handle: number) => MediaStats & {
    detectedType: string;
};
/**
 * Create a file handle wrapper with automatic cleanup
 */
export declare class FileHandle {
    private handle;
    private closed;
    constructor(uri: string);
    getHandle(): number;
    stat(): MediaStats;
    readChunk(offset: number, length: number): {
        offset: number;
        bytesRead: number;
        eof: boolean;
        base64: string;
    };
    getPlayableUri(): string;
    close(): void;
    [Symbol.dispose](): void;
}
/**
 * Utility function to safely use a file handle with automatic cleanup
 */
export declare const withFileHandle: <T>(uri: string, operation: (handle: FileHandle) => Promise<T>) => Promise<T>;
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
export declare const pickImagesWithHandles: (options?: MediaPickerOptions) => Promise<{
    assets: MediaAsset[];
    handles: FileHandle[];
    canceled: boolean;
}>;
/**
 * Pick videos with automatic file handling
 */
export declare const pickVideosWithHandles: (options?: MediaPickerOptions) => Promise<{
    assets: MediaAsset[];
    handles: FileHandle[];
    canceled: boolean;
}>;
/**
 * Pick media with automatic file handling
 */
export declare const pickMediaWithHandles: (options?: MediaPickerOptions) => Promise<{
    assets: MediaAsset[];
    handles: FileHandle[];
    canceled: boolean;
}>;
/**
 * Process picked media files with automatic cleanup
 */
export declare const processPickedMedia: <T>(pickerFunction: () => Promise<{
    assets: MediaAsset[];
    handles: FileHandle[];
    canceled: boolean;
}>, processor: (assets: MediaAsset[], handles: FileHandle[]) => Promise<T>) => Promise<T | null>;
//# sourceMappingURL=utils.d.ts.map