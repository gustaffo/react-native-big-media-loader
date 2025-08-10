#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTTurboModule.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <Photos/Photos.h>
#import <PhotosUI/PhotosUI.h>
#import "BigMediaLoader.h"

@interface BigMediaHandle : NSObject
@property (nonatomic, strong) NSURL *url;
@property (nonatomic, strong) NSFileHandle *fh;
@property (nonatomic, assign) unsigned long long size;
@property (nonatomic, copy) NSString *mime;
@property (nonatomic, copy) NSString *name;
@end

@implementation BigMediaHandle
@end

@interface BigMediaLoader () <RCTBridgeModule, PHPickerViewControllerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate>
@property (nonatomic, strong) RCTPromiseResolveBlock resolveBlock;
@property (nonatomic, strong) RCTPromiseRejectBlock rejectBlock;
@property (nonatomic, strong) UIViewController *presentingViewController;
@end

@implementation BigMediaLoader {
  NSMutableDictionary<NSNumber *, BigMediaHandle *> *_handles;
  int _nextId;
}

RCT_EXPORT_MODULE(BigMediaLoader)

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init {
  if (self = [super init]) {
    _handles = [NSMutableDictionary new];
    _nextId = 1;
  }
  return self;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(open:(NSString *)uri) {
  NSURL *url = [NSURL URLWithString:uri];
  if (!url.isFileURL) {
    // Allow file:///… or also you can accept security-scoped bookmarks if needed.
    // For simplicity, assume file:// here.
  }
  NSError *err = nil;
  NSFileHandle *fh = [NSFileHandle fileHandleForReadingFromURL:url error:&err];
  if (err || !fh) {
    @throw [NSException exceptionWithName:@"BigMediaLoader"
                                   reason:[NSString stringWithFormat:@"Failed to open: %@", err]
                                 userInfo:nil];
  }

  NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:nil];
  unsigned long long size = [attrs fileSize];

  BigMediaHandle *h = [BigMediaHandle new];
  h.url = url;
  h.fh = fh;
  h.size = size;
  h.mime = nil; // Could guess using UTType
  h.name = url.lastPathComponent;

  NSNumber *hid = @(_nextId++);
  _handles[hid] = h;
  return hid;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(close:(nonnull NSNumber *)handle) {
  BigMediaHandle *h = _handles[handle];
  if (h) {
    [h.fh closeFile];
    [_handles removeObjectForKey:handle];
  }
  return nil;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(stat:(nonnull NSNumber *)handle) {
  BigMediaHandle *h = _handles[handle];
  if (!h) return nil;
  return @{
    @"size": @(h.size),
    @"mime": h.mime ?: [NSNull null],
    @"name": h.name ?: [NSNull null],
    @"uri": h.url.absoluteString
  };
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(playableUri:(nonnull NSNumber *)handle) {
  BigMediaHandle *h = _handles[handle];
  if (!h) return nil;
  return h.url.absoluteString;
}

static NSString *toBase64(NSData *data) {
  return [data base64EncodedStringWithOptions:0];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readBase64:(nonnull NSNumber *)handle
                                          offset:(nonnull NSNumber *)offset
                                          length:(nonnull NSNumber *)length) {
  BigMediaHandle *h = _handles[handle];
  if (!h) return nil;

  unsigned long long off = [offset unsignedLongLongValue];
  unsigned long long len = [length unsignedLongLongValue];

  [h.fh seekToFileOffset:off];
  NSData *d = [h.fh readDataOfLength:(NSUInteger)len];
  BOOL eof = (off + d.length) >= h.size;

  return @{
    @"offset": @(off),
    @"bytesRead": @(d.length),
    @"eof": @(eof),
    @"base64": toBase64(d)
  };
}

// MARK: - Media Picker Methods

RCT_EXPORT_METHOD(pickImage:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [self pickMediaWithType:PHPickerFilterImages options:options resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(pickVideo:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [self pickMediaWithType:PHPickerFilterVideos options:options resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(pickMedia:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *mediaType = options[@"mediaType"];
  PHPickerFilter filter = PHPickerFilterAny;
  
  if ([mediaType isEqualToString:@"image"]) {
    filter = PHPickerFilterImages;
  } else if ([mediaType isEqualToString:@"video"]) {
    filter = PHPickerFilterVideos;
  }
  
  [self pickMediaWithType:filter options:options resolver:resolve rejecter:reject];
}

- (void)pickMediaWithType:(PHPickerFilter)filter
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject {
  
  self.resolveBlock = resolve;
  self.rejectBlock = reject;
  
  dispatch_async(dispatch_get_main_queue(), ^{
    PHPickerConfiguration *config = [[PHPickerConfiguration alloc] init];
    config.filter = filter;
    config.selectionLimit = [options[@"multiple"] boolValue] ? 
      ([options[@"maxCount"] integerValue] ?: 10) : 1;
    
    PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:config];
    picker.delegate = self;
    
    UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
    while (rootViewController.presentedViewController) {
      rootViewController = rootViewController.presentedViewController;
    }
    
    self.presentingViewController = rootViewController;
    [rootViewController presentViewController:picker animated:YES completion:nil];
  });
}

// MARK: - PHPickerViewControllerDelegate

- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results {
  [picker dismissViewControllerAnimated:YES completion:nil];
  
  if (results.count == 0) {
    self.resolveBlock(@{
      @"assets": @[],
      @"canceled": @YES
    });
    return;
  }
  
  NSMutableArray *assets = [NSMutableArray array];
  dispatch_group_t group = dispatch_group_create();
  
  for (PHPickerResult *result in results) {
    dispatch_group_enter(group);
    
    [result.itemProvider loadObjectOfClass:[NSURL class] completionHandler:^(NSURL *url, NSError *error) {
      if (error) {
        dispatch_group_leave(group);
        return;
      }
      
      NSMutableDictionary *asset = [NSMutableDictionary dictionary];
      asset[@"uri"] = url.absoluteString;
      
      // Get file info
      NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:nil];
      if (attrs) {
        asset[@"fileSize"] = @([attrs fileSize]);
        asset[@"fileName"] = url.lastPathComponent;
      }
      
      // Get image/video info if available
      if ([result.itemProvider hasItemConformingToTypeIdentifier:UTTypeImage.identifier]) {
        [result.itemProvider loadObjectOfClass:[UIImage class] completionHandler:^(UIImage *image, NSError *error) {
          if (image) {
            asset[@"width"] = @(image.size.width);
            asset[@"height"] = @(image.size.height);
            asset[@"type"] = @"image";
          }
          dispatch_group_leave(group);
        }];
      } else if ([result.itemProvider hasItemConformingToTypeIdentifier:UTTypeMovie.identifier]) {
        asset[@"type"] = @"video";
        // For videos, we'd need AVAsset to get duration, but that's more complex
        dispatch_group_leave(group);
      } else {
        dispatch_group_leave(group);
      }
      
      [assets addObject:asset];
    }];
  }
  
  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    self.resolveBlock(@{
      @"assets": assets,
      @"canceled": @NO
    });
  });
}

@end
