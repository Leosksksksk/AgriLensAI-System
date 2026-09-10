//src/services/aiService.js
import { Asset } from 'expo-asset';
// Depending on your TFLite package (e.g., react-native-fast-tflite or similar)
// import { loadTensorflowModel } from 'react-native-fast-tflite';

export async function loadCropModel(cropType) {
  try {
    let modelAsset;

    // Select the correct model based on the chosen crop
    switch (cropType) {
      case 'tomato':
        modelAsset = require('../../assets/models/tomato_model.tflite');
        break;
      case 'corn':
        modelAsset = require('../../assets/models/corn_model.tflite');
        break;
      case 'pepper':
        modelAsset = require('../../assets/models/pepper_model.tflite');
        break;
      case 'potato':
        modelAsset = require('../../assets/models/potato_model.tflite');
        break;
      default:
        throw new Error('Unsupported crop type');
    }

    // Resolve asset URI for mobile execution
    const asset = Asset.fromModule(modelAsset);
    await asset.downloadAsync();

    console.log(`Successfully loaded ${cropType} model for offline inference.`);
    return asset.localUri;
  } catch (error) {
    console.error('Error loading model:', error);
    throw error;
  }
}