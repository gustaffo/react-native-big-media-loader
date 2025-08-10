import { BigMediaLoader } from '../../src/index';
import { TurboModuleRegistry } from 'react-native';

// Mock the TurboModule
const mockTurboModule = {
  open: jest.fn(),
  close: jest.fn(),
  stat: jest.fn(),
  readBase64: jest.fn(),
  playableUri: jest.fn(),
  pickImage: jest.fn(),
  pickVideo: jest.fn(),
  pickMedia: jest.fn(),
};

(TurboModuleRegistry.getEnforcing as jest.Mock).mockReturnValue(mockTurboModule);

describe('BigMediaLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Operations', () => {
    it('should open a file and return handle', () => {
      const mockHandle = 123;
      const testUri = 'file:///test/path/file.mp4';
      
      mockTurboModule.open.mockReturnValue(mockHandle);
      
      const handle = BigMediaLoader.open(testUri);
      
      expect(mockTurboModule.open).toHaveBeenCalledWith(testUri);
      expect(handle).toBe(mockHandle);
    });

    it('should close a file handle', () => {
      const testHandle = 123;
      
      BigMediaLoader.close(testHandle);
      
      expect(mockTurboModule.close).toHaveBeenCalledWith(testHandle);
    });

    it('should get file stats', () => {
      const testHandle = 123;
      const mockStats = {
        size: 1024,
        mime: 'video/mp4',
        name: 'test.mp4',
        uri: 'file:///test/path/file.mp4'
      };
      
      mockTurboModule.stat.mockReturnValue(mockStats);
      
      const stats = BigMediaLoader.stat(testHandle);
      
      expect(mockTurboModule.stat).toHaveBeenCalledWith(testHandle);
      expect(stats).toEqual(mockStats);
    });

    it('should read file chunk', () => {
      const testHandle = 123;
      const offset = 0;
      const length = 1024;
      const mockChunk = {
        offset: 0,
        bytesRead: 1024,
        eof: false,
        base64: 'dGVzdCBkYXRh'
      };
      
      mockTurboModule.readBase64.mockReturnValue(mockChunk);
      
      const chunk = BigMediaLoader.readBase64(testHandle, offset, length);
      
      expect(mockTurboModule.readBase64).toHaveBeenCalledWith(testHandle, offset, length);
      expect(chunk).toEqual(mockChunk);
    });

    it('should get playable URI', () => {
      const testHandle = 123;
      const mockUri = 'file:///test/path/file.mp4';
      
      mockTurboModule.playableUri.mockReturnValue(mockUri);
      
      const uri = BigMediaLoader.playableUri(testHandle);
      
      expect(mockTurboModule.playableUri).toHaveBeenCalledWith(testHandle);
      expect(uri).toBe(mockUri);
    });
  });

  describe('Media Picker Operations', () => {
    it('should pick images', async () => {
      const mockResult = {
        assets: [
          {
            uri: 'file:///test/image.jpg',
            fileName: 'image.jpg',
            fileSize: 1024,
            type: 'image',
            width: 1920,
            height: 1080
          }
        ],
        canceled: false
      };
      
      mockTurboModule.pickImage.mockResolvedValue(mockResult);
      
      const result = await BigMediaLoader.pickImage({
        multiple: true,
        maxCount: 5
      });
      
      expect(mockTurboModule.pickImage).toHaveBeenCalledWith({
        multiple: true,
        maxCount: 5
      });
      expect(result).toEqual(mockResult);
    });

    it('should pick videos', async () => {
      const mockResult = {
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
      
      mockTurboModule.pickVideo.mockResolvedValue(mockResult);
      
      const result = await BigMediaLoader.pickVideo({
        multiple: false
      });
      
      expect(mockTurboModule.pickVideo).toHaveBeenCalledWith({
        multiple: false
      });
      expect(result).toEqual(mockResult);
    });

    it('should pick media', async () => {
      const mockResult = {
        assets: [
          {
            uri: 'file:///test/media.mp4',
            fileName: 'media.mp4',
            fileSize: 512000,
            type: 'video'
          }
        ],
        canceled: false
      };
      
      mockTurboModule.pickMedia.mockResolvedValue(mockResult);
      
      const result = await BigMediaLoader.pickMedia({
        multiple: true,
        mediaType: 'all'
      });
      
      expect(mockTurboModule.pickMedia).toHaveBeenCalledWith({
        multiple: true,
        mediaType: 'all'
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle canceled picker', async () => {
      const mockResult = {
        assets: [],
        canceled: true
      };
      
      mockTurboModule.pickImage.mockResolvedValue(mockResult);
      
      const result = await BigMediaLoader.pickImage();
      
      expect(result.canceled).toBe(true);
      expect(result.assets).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle file open errors', () => {
      const testUri = 'invalid://uri';
      const errorMessage = 'Failed to open file';
      
      mockTurboModule.open.mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      expect(() => {
        BigMediaLoader.open(testUri);
      }).toThrow(errorMessage);
    });

    it('should handle picker errors', async () => {
      const errorMessage = 'Picker failed';
      
      mockTurboModule.pickImage.mockRejectedValue(new Error(errorMessage));
      
      await expect(BigMediaLoader.pickImage()).rejects.toThrow(errorMessage);
    });
  });
});
