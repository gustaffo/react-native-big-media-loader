import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type MediaStats = {
  size: number;    // bytes
  mime: string | null;
  name: string | null;
  uri: string;
};

export type Chunk = {
  offset: number;
  bytesRead: number;
  eof: boolean;
  data?: ArrayBuffer; // optional if you only want native-side ops
};

export interface Spec extends TurboModule {
  /**
   * Open a file and return a numeric handle you can reuse.
   * Pass a SAF uri on Android (content://...) or a file:// path on iOS.
   */
  open(uri: string): number;

  close(handle: number): void;

  stat(handle: number): MediaStats;

  /**
   * Read up to `length` bytes starting at `offset`.
   * For simplicity this returns a Base64 string here (bridge-friendly).
   * If you want max perf, switch to JSI + ArrayBuffer.
   */
  readBase64(handle: number, offset: number, length: number): {
    offset: number;
    bytesRead: number;
    eof: boolean;
    base64: string;
  };

  /**
   * Return a sharable URI/path you can feed to a native media player.
   * (On Android we just return the original content://; on iOS, file://)
   */
  playableUri(handle: number): string;

  /**
   * Open native media picker for images
   */
  pickImage(options?: {
    multiple?: boolean;
    maxCount?: number;
    quality?: number;
    includeBase64?: boolean;
  }): Promise<{
    assets: Array<{
      uri: string;
      fileName?: string;
      fileSize?: number;
      type?: string;
      width?: number;
      height?: number;
      base64?: string;
    }>;
    canceled: boolean;
  }>;

  /**
   * Open native media picker for videos
   */
  pickVideo(options?: {
    multiple?: boolean;
    maxCount?: number;
    quality?: number;
    includeBase64?: boolean;
  }): Promise<{
    assets: Array<{
      uri: string;
      fileName?: string;
      fileSize?: number;
      type?: string;
      width?: number;
      height?: number;
      duration?: number;
      base64?: string;
    }>;
    canceled: boolean;
  }>;

  /**
   * Open native media picker for both images and videos
   */
  pickMedia(options?: {
    multiple?: boolean;
    maxCount?: number;
    quality?: number;
    includeBase64?: boolean;
    mediaType?: 'image' | 'video' | 'all';
  }): Promise<{
    assets: Array<{
      uri: string;
      fileName?: string;
      fileSize?: number;
      type?: string;
      width?: number;
      height?: number;
      duration?: number;
      base64?: string;
    }>;
    canceled: boolean;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BigMediaLoader');
