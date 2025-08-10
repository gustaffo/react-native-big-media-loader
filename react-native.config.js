module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspec: 'react-native-big-media-loader.podspec',
      },
      android: {
        sourceDir: 'android',
        packageImportPath: 'import com.yourorg.bigmedialoader.BigMediaLoaderPackage;',
        packageInstance: 'new BigMediaLoaderPackage()',
      },
    },
  },
};
