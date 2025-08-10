import { BigMediaLoader } from '../../src/index';
import { 
  pickImagesWithHandles, 
  pickVideosWithHandles, 
  pickMediaWithHandles,
  processPickedMedia,
  uploadFileInChunks,
  calculateFileHash
} from '../../src/utils';

// Mock the native module for integration testing
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

describe('Media Picker Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Image Picker Flow', () => {
    it('should handle complete image picking and processing flow', async () => {
      // Mock picker result
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/image1.jpg',
            fileName: 'image1.jpg',
            fileSize: 1024,
            type: 'image',
            width: 1920,
            height: 1080
          },
          {
            uri: 'file:///test/image2.jpg',
            fileName: 'image2.jpg',
            fileSize: 2048,
            type: 'image',
            width: 1280,
            height: 720
          }
        ],
        canceled: false
      };

      // Mock file operations
      mockBigMediaLoader.pickImage.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockReturnValueOnce(1).mockReturnValueOnce(2);
      mockBigMediaLoader.stat
        .mockReturnValueOnce({ size: 1024, mime: 'image/jpeg', name: 'image1.jpg', uri: 'file:///test/image1.jpg' })
        .mockReturnValueOnce({ size: 2048, mime: 'image/jpeg', name: 'image2.jpg', uri: 'file:///test/image2.jpg' });

      // Execute the complete flow
      const result = await pickImagesWithHandles({
        multiple: true,
        maxCount: 5
      });

      // Verify picker was called correctly
      expect(mockBigMediaLoader.pickImage).toHaveBeenCalledWith({
        multiple: true,
        maxCount: 5
      });

      // Verify file handles were created
      expect(mockBigMediaLoader.open).toHaveBeenCalledTimes(2);
      expect(mockBigMediaLoader.open).toHaveBeenCalledWith('file:///test/image1.jpg');
      expect(mockBigMediaLoader.open).toHaveBeenCalledWith('file:///test/image2.jpg');

      // Verify result structure
      expect(result.assets).toEqual(mockPickerResult.assets);
      expect(result.handles).toHaveLength(2);
      expect(result.canceled).toBe(false);

      // Test processing the picked images
      const processedResult = await processPickedMedia(
        () => Promise.resolve(result),
        async (assets, handles) => {
          const stats = [];
          for (const handle of handles) {
            stats.push(handle.stat());
          }
          return stats;
        }
      );

      expect(processedResult).toHaveLength(2);
      expect(mockBigMediaLoader.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complete Video Picker Flow', () => {
    it('should handle complete video picking and processing flow', async () => {
      // Mock picker result
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/video.mp4',
            fileName: 'video.mp4',
            fileSize: 1024000,
            type: 'video',
            width: 1920,
            height: 1080,
            duration: 60
          }
        ],
        canceled: false
      };

      // Mock file operations
      mockBigMediaLoader.pickVideo.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      mockBigMediaLoader.stat.mockReturnValue({ 
        size: 1024000, 
        mime: 'video/mp4', 
        name: 'video.mp4', 
        uri: 'file:///test/video.mp4' 
      });
      mockBigMediaLoader.readBase64.mockReturnValue({
        offset: 0,
        bytesRead: 1024,
        eof: true,
        base64: 'dGVzdCB2aWRlbyBkYXRh'
      });

      // Execute the complete flow
      const result = await pickVideosWithHandles({
        multiple: false
      });

      // Verify picker was called correctly
      expect(mockBigMediaLoader.pickVideo).toHaveBeenCalledWith({
        multiple: false
      });

      // Verify file handle was created
      expect(mockBigMediaLoader.open).toHaveBeenCalledWith('file:///test/video.mp4');

      // Test video processing (e.g., hash calculation)
      const hash = await calculateFileHash(result.handles[0].getHandle());
      expect(hash).toBe('mocked-hash');

      // Test getting playable URI
      mockBigMediaLoader.playableUri.mockReturnValue('file:///test/video.mp4');
      const playableUri = result.handles[0].getPlayableUri();
      expect(playableUri).toBe('file:///test/video.mp4');

      // Clean up
      result.handles.forEach(handle => handle.close());
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(1);
    });
  });

  describe('Complete Media Picker Flow', () => {
    it('should handle complete media picking and processing flow', async () => {
      // Mock picker result with mixed media types
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/image.jpg',
            fileName: 'image.jpg',
            fileSize: 1024,
            type: 'image',
            width: 1920,
            height: 1080
          },
          {
            uri: 'file:///test/video.mp4',
            fileName: 'video.mp4',
            fileSize: 2048000,
            type: 'video',
            width: 1280,
            height: 720,
            duration: 30
          }
        ],
        canceled: false
      };

      // Mock file operations
      mockBigMediaLoader.pickMedia.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockReturnValueOnce(1).mockReturnValueOnce(2);
      mockBigMediaLoader.stat
        .mockReturnValueOnce({ size: 1024, mime: 'image/jpeg', name: 'image.jpg', uri: 'file:///test/image.jpg' })
        .mockReturnValueOnce({ size: 2048000, mime: 'video/mp4', name: 'video.mp4', uri: 'file:///test/video.mp4' });

      // Execute the complete flow
      const result = await pickMediaWithHandles({
        multiple: true,
        mediaType: 'all'
      });

      // Verify picker was called correctly
      expect(mockBigMediaLoader.pickMedia).toHaveBeenCalledWith({
        multiple: true,
        mediaType: 'all'
      });

      // Verify file handles were created
      expect(mockBigMediaLoader.open).toHaveBeenCalledTimes(2);

      // Test processing different media types
      const processedResult = await processPickedMedia(
        () => Promise.resolve(result),
        async (assets, handles) => {
          const results = [];
          for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            const handle = handles[i];
            const stats = handle.stat();
            
            results.push({
              type: asset.type,
              size: stats.size,
              name: stats.name
            });
          }
          return results;
        }
      );

      expect(processedResult).toEqual([
        { type: 'image', size: 1024, name: 'image.jpg' },
        { type: 'video', size: 2048000, name: 'video.mp4' }
      ]);

      // Verify cleanup
      expect(mockBigMediaLoader.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('Upload Integration Flow', () => {
    it('should handle complete upload flow with picked media', async () => {
      // Mock picker result
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/large-video.mp4',
            fileName: 'large-video.mp4',
            fileSize: 10485760, // 10MB
            type: 'video'
          }
        ],
        canceled: false
      };

      // Mock file operations
      mockBigMediaLoader.pickVideo.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      mockBigMediaLoader.stat.mockReturnValue({ 
        size: 10485760, 
        mime: 'video/mp4', 
        name: 'large-video.mp4', 
        uri: 'file:///test/large-video.mp4' 
      });

      // Mock chunked reading
      let offset = 0;
      const chunkSize = 1024 * 1024; // 1MB chunks
      mockBigMediaLoader.readBase64.mockImplementation(() => {
        const currentOffset = offset;
        offset += chunkSize;
        const isEOF = currentOffset + chunkSize >= 10485760;
        
        return {
          offset: currentOffset,
          bytesRead: isEOF ? 10485760 - currentOffset : chunkSize,
          eof: isEOF,
          base64: 'dGVzdCBjaHVuayBkYXRh'
        };
      });

      // Execute the complete flow
      const result = await pickVideosWithHandles({
        multiple: false
      });

      // Test upload with chunked reading
      const uploadChunks = [];
      const uploadFunction = jest.fn().mockImplementation(async (chunk, offset) => {
        uploadChunks.push({ chunk, offset });
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await uploadFileInChunks(result.handles[0].getHandle(), {
        uploadFunction,
        chunkSize: 1024 * 1024, // 1MB chunks
        retryAttempts: 2,
        retryDelay: 100,
        onProgress: (currentOffset, totalSize) => {
          const percentage = Math.round((currentOffset / totalSize) * 100);
          console.log(`Upload progress: ${percentage}%`);
        }
      });

      // Verify upload was called for each chunk
      expect(uploadFunction).toHaveBeenCalledTimes(10); // 10MB / 1MB = 10 chunks
      expect(uploadChunks).toHaveLength(10);

      // Verify progress tracking
      expect(uploadChunks[0].offset).toBe(0);
      expect(uploadChunks[9].offset).toBe(9437184); // 9 * 1024 * 1024

      // Clean up
      result.handles.forEach(handle => handle.close());
      expect(mockBigMediaLoader.close).toHaveBeenCalledWith(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle picker cancellation gracefully', async () => {
      // Mock canceled picker
      const mockCanceledResult = {
        assets: [],
        canceled: true
      };

      mockBigMediaLoader.pickImage.mockResolvedValue(mockCanceledResult);

      // Execute the flow
      const result = await pickImagesWithHandles({
        multiple: true
      });

      // Verify no file handles were created
      expect(result.assets).toEqual([]);
      expect(result.handles).toEqual([]);
      expect(result.canceled).toBe(true);
      expect(mockBigMediaLoader.open).not.toHaveBeenCalled();
    });

    it('should handle file operation errors gracefully', async () => {
      // Mock picker result
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/image.jpg',
            fileName: 'image.jpg',
            fileSize: 1024,
            type: 'image'
          }
        ],
        canceled: false
      };

      mockBigMediaLoader.pickImage.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockImplementation(() => {
        throw new Error('File not found');
      });

      // Execute the flow and expect error
      await expect(pickImagesWithHandles({
        multiple: false
      })).rejects.toThrow('File not found');
    });

    it('should handle upload errors with retry logic', async () => {
      // Mock picker result
      const mockPickerResult = {
        assets: [
          {
            uri: 'file:///test/video.mp4',
            fileName: 'video.mp4',
            fileSize: 2048,
            type: 'video'
          }
        ],
        canceled: false
      };

      mockBigMediaLoader.pickVideo.mockResolvedValue(mockPickerResult);
      mockBigMediaLoader.open.mockReturnValue(1);
      mockBigMediaLoader.stat.mockReturnValue({ 
        size: 2048, 
        mime: 'video/mp4', 
        name: 'video.mp4', 
        uri: 'file:///test/video.mp4' 
      });
      mockBigMediaLoader.readBase64.mockReturnValue({
        offset: 0,
        bytesRead: 2048,
        eof: true,
        base64: 'dGVzdCBkYXRh'
      });

      const result = await pickVideosWithHandles({
        multiple: false
      });

      // Mock upload function that fails first, then succeeds
      const uploadFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      // Test upload with retry
      await uploadFileInChunks(result.handles[0].getHandle(), {
        uploadFunction,
        retryAttempts: 2,
        retryDelay: 10
      });

      // Verify retry logic
      expect(uploadFunction).toHaveBeenCalledTimes(2);

      // Clean up
      result.handles.forEach(handle => handle.close());
    });
  });
});
