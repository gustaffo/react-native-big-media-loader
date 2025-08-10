module.exports = {
  dependency: {
    platforms: {
      ios: {
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
