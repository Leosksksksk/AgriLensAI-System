// src/services/aiEngineService.js
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';

/**
 * On-device leaf analysis engine.
 *
 * Plant-detection gate: requires a meaningful proportion of the photo's
 * pixels to fall into SATURATED leaf-color hues (green, yellow, orange,
 * brown) — not just any dark or light pixel. Earlier versions treated
 * "black spot" and "white mildew" matches (essentially: any dark pixel,
 * any light-gray pixel) as evidence of plant content, which incorrectly
 * passed non-plant photos containing black/gray/dark elements (keyboards,
 * electronics, code editor screenshots with colorful syntax highlighting,
 * etc). Real chromatic content — actual green/brown/yellow/orange hues —
 * is now required as the primary signal; achromatic buckets only refine
 * severity once a photo has already qualified as plant-like.
 */
export async function analyzeLeaf(imageUri) {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 200 } }],
    { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  const arrayBuffer = decodeBase64(manipulated.base64);
  const bytes = new Uint8Array(arrayBuffer);

  let rawImageData;
  try {
    rawImageData = jpeg.decode(bytes, { useTArray: true });
  } catch (e) {
    throw new Error('Could not analyze this photo. Please try a clearer image.');
  }

  const { width, height, data } = rawImageData;

  let totalLeafPixels = 0;
  let healthyGreenPixels = 0;
  let brownNecroticPixels = 0;
  let blackSpotPixels = 0;
  let whiteMildewPixels = 0;
  let orangeRustPixels = 0;
  let yellowChloroticPixels = 0;

  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const [h, s, v] = rgbToHsv(r, g, b);

      const isBackground = (v > 0.92 && s < 0.12) || v < 0.06;
      if (isBackground) continue;

      totalLeafPixels++;

      if (h >= 70 && h <= 165 && s > 0.25 && v > 0.15) {
        healthyGreenPixels++;
        continue;
      }
      if (h >= 40 && h < 70 && s > 0.3 && v > 0.3) {
        yellowChloroticPixels++;
        continue;
      }
      if (h >= 15 && h < 40 && s > 0.45 && v > 0.35) {
        orangeRustPixels++;
        continue;
      }
      if (h >= 5 && h < 35 && s > 0.25 && v <= 0.55) {
        brownNecroticPixels++;
        continue;
      }
      if (v < 0.22 && s < 0.5) {
        blackSpotPixels++;
        continue;
      }
      if (s < 0.15 && v >= 0.55 && v <= 0.92) {
        whiteMildewPixels++;
        continue;
      }
    }
  }

  if (totalLeafPixels === 0) {
    return { isPlant: false, diseaseId: null, damagePercent: 0, severity: 'Unknown', confidence: 0 };
  }

  // Chromatic (colorful, saturated) leaf-hue content — the real signal.
  // Achromatic content (black spots, white film) doesn't count toward
  // this gate on its own, since grays/blacks/whites appear in countless
  // non-plant subjects (electronics, fabric, walls, shadows).
  const chromaticPixels = healthyGreenPixels + yellowChloroticPixels + orangeRustPixels + brownNecroticPixels;
  const chromaticRatio = chromaticPixels / totalLeafPixels;

  const CHROMATIC_THRESHOLD = 0.20;

  if (chromaticRatio < CHROMATIC_THRESHOLD) {
    return {
      isPlant: false,
      diseaseId: null,
      damagePercent: 0,
      severity: 'Unknown',
      confidence: 0,
      chromaticRatio: Number(chromaticRatio.toFixed(2)),
    };
  }

  const damagedPixels =
    brownNecroticPixels + blackSpotPixels + whiteMildewPixels + orangeRustPixels + yellowChloroticPixels;

  const damagePercent = Math.min(100, (damagedPixels / totalLeafPixels) * 100);

    // Mapped to tomato-specific disease ids (per the "tomatoleaf" Kaggle
  // dataset's 10-class label set) instead of generic names, since these
  // are the 4 disease signatures this color-based engine can actually
  // distinguish from each other:
  //  - brown/necrotic patches      -> Early Blight
  //  - dark spotting + yellow halo -> Septoria Leaf Spot
  //  - pale/white surface film     -> Leaf Mold
  //  - orange/tan concentric marks -> Target Spot
  // The other 5 tomato diseases in the dataset (Bacterial Spot, Late
  // Blight, Spider Mites, TYLCV, Mosaic Virus) are NOT visually
  // distinguishable from these 4 with a color-only heuristic — they
  // exist in diseaseCatalog.js as reference data only.
  const signatureCounts = {
    tomatoEarlyBlight: brownNecroticPixels,
    tomatoSeptoriaLeafSpot: blackSpotPixels + Math.floor(yellowChloroticPixels / 2),
    tomatoLeafMold: whiteMildewPixels,
    tomatoTargetSpot: orangeRustPixels,
  };

  let dominantId = 'healthy';
  let dominantCount = 0;
  Object.entries(signatureCounts).forEach(([id, count]) => {
    if (count > dominantCount) {
      dominantCount = count;
      dominantId = id;
    }
  });

  const signalRatio = dominantCount / totalLeafPixels;
  const diseaseId = damagePercent < 4 || signalRatio < 0.03 ? 'healthy' : dominantId;

  const severity = classifySeverity(diseaseId === 'healthy' ? 0 : damagePercent);

  const confidence =
    diseaseId === 'healthy'
      ? Math.min(0.95, Math.max(0.4, 1 - damagePercent / 20))
      : Math.min(0.9, Math.max(0.55, 0.55 + signalRatio));

  return {
    isPlant: true,
    diseaseId,
    damagePercent: Number(damagePercent.toFixed(1)),
    severity,
    confidence: Number(confidence.toFixed(2)),
  };
}

function classifySeverity(damagePercent) {
  if (damagePercent <= 0.01) return 'None';
  if (damagePercent < 15) return 'Mild';
  if (damagePercent < 40) return 'Moderate';
  return 'Severe';
}

function rgbToHsv(r, g, b) {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const maxV = Math.max(rN, gN, bN);
  const minV = Math.min(rN, gN, bN);
  const delta = maxV - minV;

  let hue = 0;
  if (delta !== 0) {
    if (maxV === rN) hue = 60 * (((gN - bN) / delta) % 6);
    else if (maxV === gN) hue = 60 * ((bN - rN) / delta + 2);
    else hue = 60 * ((rN - gN) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const sat = maxV === 0 ? 0 : delta / maxV;
  const val = maxV;

  return [hue, sat, val];
}