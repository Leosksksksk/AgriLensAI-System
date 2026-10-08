import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';

const MODEL_INPUT_SIZE = 256;

const MODEL_ASSETS = {
  corn: require('../../assets/models/corn_model.tflite'),
  pepper: require('../../assets/models/pepper_model.tflite'),
  potato: require('../../assets/models/potato_model.tflite'),
  tomato: require('../../assets/models/tomato_model.tflite'),
};

export const DISEASE_IDS_BY_CROP = {
  corn: ['cornCommonRust', 'cornGrayLeafSpot', 'cornNorthernLeafBlight', 'healthy'],
  pepper: ['pepperBacterialSpot', 'healthy'],
  potato: ['potatoEarlyBlight', 'potatoLateBlight', 'healthy'],
  tomato: ['tomatoEarlyBlight', 'tomatoLateBlight', 'tomatoLeafMold', 'healthy'],
};

const loadedModels = new Map();

export async function preprocessImageForModel(imageUri) {
  const resizedImage = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  );
  const base64 = await FileSystem.readAsStringAsync(resizedImage.uri, {
    encoding: 'base64',
  });

  let decodedImage;
  try {
    decodedImage = jpeg.decode(new Uint8Array(decodeBase64(base64)), { useTArray: true });
  } catch (error) {
    throw new Error('Could not decode the resized image for model input.');
  }

  if (decodedImage.width !== MODEL_INPUT_SIZE || decodedImage.height !== MODEL_INPUT_SIZE) {
    throw new Error('Resized image dimensions do not match the model input.');
  }

  const normalizedPixels = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  for (let pixelIndex = 0; pixelIndex < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; pixelIndex++) {
    const sourceIndex = pixelIndex * 4;
    const targetIndex = pixelIndex * 3;
    normalizedPixels[targetIndex] = decodedImage.data[sourceIndex] / 255;
    normalizedPixels[targetIndex + 1] = decodedImage.data[sourceIndex + 1] / 255;
    normalizedPixels[targetIndex + 2] = decodedImage.data[sourceIndex + 2] / 255;
  }

  return normalizedPixels;
}

export async function runCropInference(model, inputTensor, cropType, diseaseIdsByCrop) {
  const normalizedCropType = String(cropType ?? '').trim().toLowerCase();
  const diseaseIds = diseaseIdsByCrop?.[normalizedCropType];

  if (!(inputTensor instanceof Float32Array)) {
    throw new TypeError('Model input must be a Float32Array.');
  }
  if (!Array.isArray(diseaseIds) || diseaseIds.length === 0) {
    throw new Error(`Disease labels are not configured for crop type: ${normalizedCropType}`);
  }

  const inputBuffer = inputTensor.buffer.slice(
    inputTensor.byteOffset,
    inputTensor.byteOffset + inputTensor.byteLength
  );
  const outputBuffers = await model.run([inputBuffer]);
  if (!outputBuffers?.[0]) {
    throw new Error('The TFLite model returned no output tensor.');
  }

  const logits = new Float32Array(outputBuffers[0]);
  if (logits.length !== diseaseIds.length) {
    throw new Error(
      `Model output has ${logits.length} classes, but ${diseaseIds.length} disease labels are configured for ${normalizedCropType}.`
    );
  }

  let classIndex = 0;
  let maxLogit = logits[0];
  for (let index = 1; index < logits.length; index++) {
    if (logits[index] > maxLogit) {
      maxLogit = logits[index];
      classIndex = index;
    }
  }

  let expSum = 0;
  for (let index = 0; index < logits.length; index++) {
    expSum += Math.exp(logits[index] - maxLogit);
  }

  const diseaseId = diseaseIds[classIndex];
  if (typeof diseaseId !== 'string' || diseaseId.length === 0) {
    throw new Error(`No disease label is configured at class index ${classIndex} for ${normalizedCropType}.`);
  }

  return {
    cropType: normalizedCropType,
    classIndex,
    diseaseId,
    confidence: 1 / expSum,
  };
}

export async function loadCropModel(cropType) {
  const normalizedCropType = String(cropType ?? '').trim().toLowerCase();
  const modelAsset = MODEL_ASSETS[normalizedCropType];

  if (!modelAsset) {
    throw new Error(`Unsupported crop type: ${cropType}`);
  }

  if (!loadedModels.has(normalizedCropType)) {
    loadedModels.set(
      normalizedCropType,
      import('react-native-fast-tflite').then(({ loadTensorflowModel }) =>
        loadTensorflowModel(modelAsset, [])
      )
    );
  }

  try {
    return await loadedModels.get(normalizedCropType);
  } catch (error) {
    loadedModels.delete(normalizedCropType);
    if (/nitromodules|native.*module/i.test(error?.message || '')) {
      throw new Error(
        'TFLite is unavailable in Expo Go. Install and open the AgriLens custom development build to run crop scans.'
      );
    }
    throw error;
  }
}