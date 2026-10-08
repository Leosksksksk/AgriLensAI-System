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

export const MIN_CROP_MATCH_SCORE = 0.5;
export const MIN_CROP_MATCH_MARGIN = 0.12;

const loadedModels = new Map();

export async function preprocessImageForModel(imageUri) {
  const resizedImage = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  const base64 = resizedImage.base64 || await FileSystem.readAsStringAsync(resizedImage.uri, {
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

export function selectCropPrediction(predictions) {
  const scoredPredictions = predictions
    .filter((prediction) => Number.isFinite(prediction.confidence) && prediction.classCount > 1)
    .map((prediction) => {
      const baseline = 1 / prediction.classCount;
      const cropMatchScore = Math.max(
        0,
        Math.min(1, (prediction.confidence - baseline) / (1 - baseline))
      );
      return { ...prediction, cropMatchScore };
    })
    .sort((first, second) => second.cropMatchScore - first.cropMatchScore);

  const best = scoredPredictions[0];
  const runnerUp = scoredPredictions[1];
  const hasClearMatch = best &&
    best.cropMatchScore >= MIN_CROP_MATCH_SCORE &&
    runnerUp &&
    best.cropMatchScore - runnerUp.cropMatchScore >= MIN_CROP_MATCH_MARGIN;

  if (!hasClearMatch) {
    if (!best) {
      return { cropType: 'unknownCrop', diseaseId: 'unknownCrop', confidence: 0, cropMatchScore: 0 };
    }
    const { classCount, ...bestFit } = best;
    return { ...bestFit, isBestFit: true };
  }

  const { classCount, ...prediction } = best;
  return prediction;
}

export async function runAutoCropInference(inputTensor) {
  const predictions = [];
  const modelErrors = [];

  for (const cropType of Object.keys(MODEL_ASSETS)) {
    try {
        const model = await loadCropModel(cropType);
        const prediction = await runCropInference(
          model,
          inputTensor,
          cropType,
          DISEASE_IDS_BY_CROP
        );
      predictions.push({
        ...prediction,
        classCount: DISEASE_IDS_BY_CROP[cropType].length,
      });
    } catch (error) {
      console.warn(`Crop model ${cropType} could not analyze the image:`, error);
      modelErrors.push(error);
    }
  }

  if (predictions.length === 0) {
    throw modelErrors[0] || new Error('None of the supported crop models could analyze the image.');
  }

  return selectCropPrediction(predictions);
}

export async function loadCropModel(cropType, { cache = true } = {}) {
  const normalizedCropType = String(cropType ?? '').trim().toLowerCase();
  const modelAsset = MODEL_ASSETS[normalizedCropType];

  if (!modelAsset) {
    throw new Error(`Unsupported crop type: ${cropType}`);
  }

  const unsupportedNativeMessage =
    'TFLite is unavailable in Expo Go. Install and open the AgriLens custom development build to run crop scans.';

  try {
    if (cache && loadedModels.has(normalizedCropType)) {
      return await loadedModels.get(normalizedCropType);
    }

    {
      const tfliteModule = await import('react-native-fast-tflite').catch((error) => {
        const message = error?.message || String(error || '');
        if (
          /native module|failed to call.*react-native-fast-tflite|cannot find module|bundler.*module/i.test(message)
        ) {
          throw new Error(unsupportedNativeMessage);
        }
        throw error;
      });

      if (!tfliteModule || typeof tfliteModule.loadTensorflowModel !== 'function') {
        throw new Error(unsupportedNativeMessage);
      }

      const modelPromise = Promise.resolve().then(() =>
        tfliteModule.loadTensorflowModel(modelAsset, [])
      );
      if (cache) loadedModels.set(normalizedCropType, modelPromise);
      return await modelPromise;
    }
  } catch (error) {
    if (cache) loadedModels.delete(normalizedCropType);
    const message = error?.message || String(error || '');
    if (/TFLite is unavailable in Expo Go|native module|nitromodules|react-native-fast-tflite/i.test(message)) {
      throw new Error(unsupportedNativeMessage);
    }
    throw error;
  }
}