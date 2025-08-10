var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { BigMediaLoader } from './index';
import { Buffer } from 'buffer';
/**
 * Read a file in chunks and process each chunk
 */
export const readFileInChunks = async (handle, options = {}) => {
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
        if (eof)
            break;
    }
};
/**
 * Upload a file in chunks with retry logic
 */
export const uploadFileInChunks = async (handle, options) => {
    const { uploadFunction, retryAttempts = 3, retryDelay = 1000 } = options, readOptions = __rest(options, ["uploadFunction", "retryAttempts", "retryDelay"]);
    await readFileInChunks(handle, Object.assign(Object.assign({}, readOptions), { onChunk: async (chunk, offset) => {
            let lastError = null;
            for (let attempt = 0; attempt < retryAttempts; attempt++) {
                try {
                    await uploadFunction(chunk, offset);
                    return; // Success, exit retry loop
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retryAttempts - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }
            throw lastError || new Error('Upload failed after all retry attempts');
        } }));
};
/**
 * Calculate SHA-256 hash of a file
 */
export const calculateFileHash = async (handle) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    await readFileInChunks(handle, {
        onChunk: (chunk) => {
            hash.update(chunk);
        }
    });
    return hash.digest('hex');
};
/**
 * Read file header (first N bytes) for format detection
 */
export const readFileHeader = (handle, headerSize = 1024) => {
    const { base64 } = BigMediaLoader.readBase64(handle, 0, headerSize);
    return Buffer.from(base64, 'base64');
};
/**
 * Detect file type from header
 */
export const detectFileType = (handle) => {
    const header = readFileHeader(handle, 16);
    const hex = header.toString('hex').toLowerCase();
    // Common file signatures
    if (hex.startsWith('ffd8ff'))
        return 'image/jpeg';
    if (hex.startsWith('89504e47'))
        return 'image/png';
    if (hex.startsWith('47494638'))
        return 'image/gif';
    if (hex.startsWith('52494646') && hex.includes('41564920'))
        return 'video/avi';
    if (hex.startsWith('000001b3'))
        return 'video/mpeg';
    if (hex.startsWith('66747970'))
        return 'video/mp4';
    if (hex.startsWith('1a45dfa3'))
        return 'video/webm';
    if (hex.startsWith('25504446'))
        return 'application/pdf';
    if (hex.startsWith('504b0304'))
        return 'application/zip';
    return 'application/octet-stream';
};
/**
 * Get file information with type detection
 */
export const getFileInfo = (handle) => {
    const stats = BigMediaLoader.stat(handle);
    const detectedType = detectFileType(handle);
    return Object.assign(Object.assign({}, stats), { detectedType });
};
/**
 * Create a file handle wrapper with automatic cleanup
 */
export class FileHandle {
    constructor(uri) {
        this.closed = false;
        this.handle = BigMediaLoader.open(uri);
    }
    getHandle() {
        if (this.closed) {
            throw new Error('File handle is closed');
        }
        return this.handle;
    }
    stat() {
        return BigMediaLoader.stat(this.getHandle());
    }
    readChunk(offset, length) {
        return BigMediaLoader.readBase64(this.getHandle(), offset, length);
    }
    getPlayableUri() {
        return BigMediaLoader.playableUri(this.getHandle());
    }
    close() {
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
export const withFileHandle = async (uri, operation) => {
    const handle = new FileHandle(uri);
    try {
        return await operation(handle);
    }
    finally {
        handle.close();
    }
};
/**
 * Pick images with automatic file handling
 */
export const pickImagesWithHandles = async (options = {}) => {
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
export const pickVideosWithHandles = async (options = {}) => {
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
export const pickMediaWithHandles = async (options = {}) => {
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
export const processPickedMedia = async (pickerFunction, processor) => {
    const { assets, handles, canceled } = await pickerFunction();
    if (canceled) {
        return null;
    }
    try {
        return await processor(assets, handles);
    }
    finally {
        // Clean up handles
        handles.forEach(handle => handle.close());
    }
};
//# sourceMappingURL=utils.js.map