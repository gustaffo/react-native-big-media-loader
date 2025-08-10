#!/usr/bin/env node

/**
 * Postinstall script for React Native Big Media Loader
 * This script helps users set up iOS after installing the package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📱 React Native Big Media Loader - Post Install Setup\n');

// Check if we're in a React Native project
const isReactNativeProject = fs.existsSync('ios') && fs.existsSync('android');

if (!isReactNativeProject) {
  console.log('ℹ️  This appears to be a library installation, not a React Native project.');
  console.log('   No additional setup required for library development.\n');
  process.exit(0);
}

// Check if using Yarn or npm
const isYarn = fs.existsSync('yarn.lock');
const packageManager = isYarn ? 'yarn' : 'npm';

console.log('🔍 Detected React Native project structure...');

// Check if iOS directory exists
if (fs.existsSync('ios')) {
  console.log('\n🍎 iOS Setup:');
  
  // Check if Podfile exists
  if (fs.existsSync('ios/Podfile')) {
    console.log('✅ Podfile found');
    
    // Check if the pod is already in Podfile
    const podfileContent = fs.readFileSync('ios/Podfile', 'utf8');
    const hasPod = podfileContent.includes('react-native-big-media-loader');
    
    if (hasPod) {
      console.log('✅ Pod already added to Podfile');
    } else {
      console.log('⚠️  Pod not found in Podfile');
      console.log('   This might happen if autolinking is disabled or not working properly.');
      console.log('   You may need to manually add the pod to your Podfile:');
      console.log('   pod \'react-native-big-media-loader\', :path => \'../node_modules/react-native-big-media-loader\'');
    }
    
    // Check if Pods directory exists
    if (fs.existsSync('ios/Pods')) {
      console.log('✅ Pods directory exists');
      
      // Check if our pod is installed
      if (fs.existsSync('ios/Pods/react-native-big-media-loader')) {
        console.log('✅ Pod is installed');
      } else {
        console.log('⚠️  Pod is not installed');
        console.log('   Run the following command to install pods:');
        console.log('   cd ios && pod install');
      }
    } else {
      console.log('⚠️  Pods directory not found');
      console.log('   Run the following command to install pods:');
      console.log('   cd ios && pod install');
    }
  } else {
    console.log('❌ Podfile not found');
    console.log('   This might not be a React Native project with iOS support.');
  }
}

// Check if Android directory exists
if (fs.existsSync('android')) {
  console.log('\n🤖 Android Setup:');
  console.log('✅ Android directory found');
  console.log('   Android setup should be automatic with autolinking.');
  console.log('   No additional configuration required.');
}

console.log('\n📋 Next Steps:');
console.log('1. For iOS: Run "cd ios && pod install" if pods are not installed');
console.log('2. Clean and rebuild your project:');
console.log('   - iOS: "cd ios && xcodebuild clean"');
console.log('   - Android: "cd android && ./gradlew clean"');
console.log('3. Restart Metro bundler: "npx react-native start --reset-cache"');

console.log('\n🔗 Autolinking Status:');
console.log('   - The library is configured for autolinking');
console.log('   - iOS: Pod should be automatically added to Podfile');
console.log('   - Android: No additional setup required');

console.log('\n❓ Need Help?');
console.log('   - Check the README.md for detailed installation instructions');
console.log('   - Run "npm run test:autolinking" to verify configuration');
console.log('   - If autolinking fails, use manual linking instructions in README');

console.log('\n✨ Installation complete!');
