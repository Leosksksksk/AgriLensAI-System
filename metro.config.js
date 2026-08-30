const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support .tflite model files and .cjs Firebase modules
config.resolver.assetExts.push('tflite');
config.resolver.sourceExts.push('cjs');

module.exports = config;