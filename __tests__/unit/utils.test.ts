import {
  readFileInChunks,
  uploadFileInChunks,
  calculateFileHash,
  readFileHeader,
  detectFileType,
  getFileInfo,
  FileHandle,
  withFileHandle,
  pickImagesWithHandles,
  pickVideosWithHandles,
  pickMediaWithHandles,
  processPickedMedia,
} from '../../src/utils';
import { BigMediaLoader } from '../../src/index';
import { Buffer } from 'buffer';

// Mock BigMediaLoader
jest.mock('../../src/index', () => ({
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
}));

const mockBigMediaLoader = BigMediaLoader as jest.Mocked<typeof BigMediaLoader>;

describe('Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FileHandle', () => {
    it('should create a file handle and manage lifecycle', () => {
      const testUri = 'file:///test/file.mp4';
      const mockHandle = 123;
      
      mockBigMediaLoader.open.mockReturnValue(mockHandle);
      
      const fileHandle = new FileHandle(testUri);
      
      expect(mockBigMediaLoader.open).toHaveBeenCalledWith(testUri);
      expect(fileHandle.getHandle()).toBe(mockHandle);
      
      // Test stat
      const mockStats = { size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: testUri };
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      
      const stats = fileHandle.stat();
      expect(mockBigMediaLoader.stat).toHaveBeenCalledWith(mockHandle);
      expect(stats).toEqual(mockStats);
      
      // Test close
      fileHandle.close();
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(mockHandle);
    });

    it('should prevent operations on closed handle', () => {
      const testUri = 'file:///test/file.mp4';
      const mockHandle = 123;
      
      mockBigMediaLoader.open.mockReturnValue(mockHandle);
      
      const fileHandle = new FileHandle(testUri);
      fileHandle.close();
      
      expect(() => fileHandle.getHandle()).toThrow('File handle is closed');
    });
  });

  describe('withFileHandle', () => {
    it('should automatically close handle after operation', async () => {
      const testUri = 'file:///test/file.mp4';
      const mockHandle = 123;
      
      mockBigMediaLoader.open.mockReturnValue(mockHandle);
      mockBigMediaLoader.stat.mockReturnValue({ size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: testUri });
      
      const result = await withFileHandle(testUri, async (handle) => {
        return handle.stat();
      });
      
      expect(mockBigMediaLoader.open).toHaveBeenCalledWith(testUri);
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(mockHandle);
      expect(result).toEqual({ size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: testUri });
    });

    it('should close handle even if operation throws', async () => {
      const testUri = 'file:///test/file.mp4';
      const mockHandle = 123;
      
      mockBigMediaLoader.open.mockReturnValue(mockHandle);
      
      await expect(
        withFileHandle(testUri, async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');
      
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(mockHandle);
    });
  });

  describe('readFileInChunks', () => {
    it('should read file in chunks with progress', async () => {
      const testHandle = 123;
      const mockStats = { size: 2048, mime: 'video/mp4', name: 'file.mp4', uri: 'file:///test/file.mp4' };
      
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      mockBigMediaLoader.readBase64
        .mockReturnValueOnce({ offset: 0, bytesRead: 1024, eof: false, base64: 'dGVzdA==' })
        .mockReturnValueOnce({ offset: 1024, bytesRead: 1024, eof: true, base64: 'ZGF0YQ==' });
      
      const onChunk = jest.fn();
      const onProgress = jest.fn();
      
      await readFileInChunks(testHandle, {
        chunkSize: 1024,
        onChunk,
        onProgress,
      });
      
      expect(mockBigMediaLoader.readBase64).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadFileInChunks', () => {
    it('should upload file in chunks with retry logic', async () => {
      const testHandle = 123;
      const mockStats = { size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: 'file:///test/file.mp4' };
      
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      mockBigMediaLoader.readBase64.mockReturnValue({ offset: 0, bytesRead: 1024, eof: true, base64: 'dGVzdA==' });
      
      const uploadFunction = jest.fn().mockResolvedValue(undefined);
      
      await uploadFileInChunks(testHandle, {
        uploadFunction,
        retryAttempts: 3,
        retryDelay: 100,
      });
      
      expect(uploadFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry on upload failure', async () => {
      const testHandle = 123;
      const mockStats = { size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: 'file:///test/file.mp4' };
      
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      mockBigMediaLoader.readBase64.mockReturnValue({ offset: 0, bytesRead: 1024, eof: true, base64: 'dGVzdA==' });
      
      const uploadFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValue(undefined);
      
      await uploadFileInChunks(testHandle, {
        uploadFunction,
        retryAttempts: 2,
        retryDelay: 10,
      });
      
      expect(uploadFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate SHA-256 hash of file', async () => {
      const testHandle = 123;
      const mockStats = { size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: 'file:///test/file.mp4' };
      
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      mockBigMediaLoader.readBase64.mockReturnValue({ offset: 0, bytesRead: 1024, eof: true, base64: 'dGVzdA==' });
      
      const hash = await calculateFileHash(testHandle);
      
      expect(hash).toBe('mocked-hash');
    });
  });

  describe('readFileHeader', () => {
    it('should read file header', () => {
      const testHandle = 123;
      const mockHeader = { offset: 0, bytesRead: 1024, eof: false, base64: 'dGVzdA==' };
      
      mockBigMediaLoader.readBase64.mockReturnValue(mockHeader);
      
      const header = readFileHeader(testHandle, 1024);
      
      expect(mockBigMediaLoader.readBase64).toHaveBeenCalledWith(testHandle, 0, 1024);
      expect(header).toBeInstanceOf(Buffer);
    });
  });

  describe('detectFileType', () => {
    it('should detect JPEG file type', () => {
      const testHandle = 123;
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      
      mockBigMediaLoader.readBase64.mockReturnValue({
        offset: 0,
        bytesRead: 16,
        eof: false,
        base64: jpegHeader.toString('base64')
      });
      
      const fileType = detectFileType(testHandle);
      
      expect(fileType).toBe('image/jpeg');
    });

    it('should detect MP4 file type', () => {
      const testHandle = 123;
      const mp4Header = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]);
      
      mockBigMediaLoader.readBase64.mockReturnValue({
        offset: 0,
        bytesRead: 16,
        eof: false,
        base64: mp4Header.toString('base64')
      });
      
      const fileType = detectFileType(testHandle);
      
      expect(fileType).toBe('video/mp4');
    });
  });

  describe('getFileInfo', () => {
    it('should get file info with type detection', () => {
      const testHandle = 123;
      const mockStats = { size: 1024, mime: 'video/mp4', name: 'file.mp4', uri: 'file:///test/file.mp4' };
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      
      mockBigMediaLoader.stat.mockReturnValue(mockStats);
      mockBigMediaLoader.readBase64.mockReturnValue({
        offset: 0,
        bytesRead: 16,
        eof: false,
        base64: jpegHeader.toString('base64')
      });
      
      const fileInfo = getFileInfo(testHandle);
      
      expect(fileInfo).toEqual({
        ...mockStats,
        detectedType: 'image/jpeg'
      });
    });
  });

  describe('Media Picker Utilities', () => {
    it('should pick images with handles', async () => {
      const mockResult = {
        assets: [
          { uri: 'file:///test/image1.jpg', fileName: 'image1.jpg' },
          { uri: 'file:///test/image2.jpg', fileName: 'image2.jpg' }
        ],
        canceled: false
      };
      
      mockBigMediaLoader.pickImage.mockResolvedValue(mockResult);
      mockBigMediaLoader.open.mockReturnValueOnce(1).mockReturnValueOnce(2);
      
      const result = await pickImagesWithHandles({ multiple: true });
      
      expect(result.assets).toEqual(mockResult.assets);
      expect(result.handles).toHaveLength(2);
      expect(result.canceled).toBe(false);
    });

    it('should pick videos with handles', async () => {
      const mockResult = {
        assets: [{ uri: 'file:///test/video.mp4', fileName: 'video.mp4' }],
        canceled: false
      };
      
      mockBigMediaLoader.pickVideo.mockResolvedValue(mockResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      
      const result = await pickVideosWithHandles({ multiple: false });
      
      expect(result.assets).toEqual(mockResult.assets);
      expect(result.handles).toHaveLength(1);
      expect(result.canceled).toBe(false);
    });

    it('should pick media with handles', async () => {
      const mockResult = {
        assets: [{ uri: 'file:///test/media.mp4', fileName: 'media.mp4' }],
        canceled: false
      };
      
      mockBigMediaLoader.pickMedia.mockResolvedValue(mockResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      
      const result = await pickMediaWithHandles({ mediaType: 'all' });
      
      expect(result.assets).toEqual(mockResult.assets);
      expect(result.handles).toHaveLength(1);
      expect(result.canceled).toBe(false);
    });

    it('should process picked media with cleanup', async () => {
      const mockResult = {
        assets: [{ uri: 'file:///test/image.jpg', fileName: 'image.jpg' }],
        canceled: false
      };
      
      mockBigMediaLoader.pickImage.mockResolvedValue(mockResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      mockBigMediaLoader.stat.mockReturnValue({ size: 1024, mime: 'image/jpeg', name: 'image.jpg', uri: 'file:///test/image.jpg' });
      
      const processor = jest.fn().mockResolvedValue(['processed']);
      
      const result = await processPickedMedia(
        () => pickImagesWithHandles(),
        processor
      );
      
      expect(result).toEqual(['processed']);
      expect(processor).toHaveBeenCalledWith(mockResult.assets, expect.any(Array));
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(1);
    });

    it('should handle canceled picker in processPickedMedia', async () => {
      const mockResult = {
        assets: [],
        canceled: true
      };
      
      mockBigMediaLoader.pickImage.mockResolvedValue(mockResult);
      
      const processor = jest.fn();
      
      const result = await processPickedMedia(
        () => pickImagesWithHandles(),
        processor
      );
      
      expect(result).toBeNull();
      expect(processor).not.toHaveBeenCalled();
    });
  });
});
