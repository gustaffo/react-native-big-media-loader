module.exports = {
  dependency: {
    platforms: {
      ios: {
        project: 'ios/BigMediaLoader.xcodeproj',
        podspec: 'ios/BigMediaLoader.podspec',
      },
      android: {
        sourceDir: 'android',
        packageImportPath: 'import com.yourorg.bigmedialoader.BigMediaLoaderPackage;',
        packageInstance: 'new BigMediaLoaderPackage()',
      },
    },
  },
};
