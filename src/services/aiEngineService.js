const CHROMATIC_THRESHOLD = 0.2;
const SAMPLE_STEP = 2;

function rgbToHsv(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;

  return { hue, saturation: max === 0 ? 0 : delta / max, value: max };
}

function classifySeverity(damagePercent) {
  if (damagePercent <= 0.01) return 'None';
  if (damagePercent < 15) return 'Mild';
  if (damagePercent < 40) return 'Moderate';
  return 'Severe';
}

export function analyzeLeafPixels(normalizedRgb) {
  if (!(normalizedRgb instanceof Float32Array) || normalizedRgb.length === 0 || normalizedRgb.length % 3 !== 0) {
    throw new TypeError('Leaf analysis input must be a non-empty RGB Float32Array.');
  }

  let totalLeafPixels = 0;
  let healthyGreenPixels = 0;
  let brownNecroticPixels = 0;
  let blackSpotPixels = 0;
  let whiteMildewPixels = 0;
  let orangeRustPixels = 0;
  let yellowChloroticPixels = 0;
  const pixelCount = normalizedRgb.length / 3;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += SAMPLE_STEP) {
    const offset = pixelIndex * 3;
    const { hue, saturation, value } = rgbToHsv(
      normalizedRgb[offset],
      normalizedRgb[offset + 1],
      normalizedRgb[offset + 2]
    );

    if ((value > 0.92 && saturation < 0.12) || value < 0.06) continue;

    totalLeafPixels++;
    if (hue >= 70 && hue <= 165 && saturation > 0.25 && value > 0.15) {
      healthyGreenPixels++;
      continue;
    }
    if (hue >= 40 && hue < 70 && saturation > 0.3 && value > 0.3) {
      yellowChloroticPixels++;
      continue;
    }
    if (hue >= 15 && hue < 40 && saturation > 0.45 && value > 0.35) {
      orangeRustPixels++;
      continue;
    }
    if (hue >= 5 && hue < 35 && saturation > 0.25 && value <= 0.55) {
      brownNecroticPixels++;
      continue;
    }
    if (value < 0.22 && saturation < 0.5) {
      blackSpotPixels++;
      continue;
    }
    if (saturation < 0.15 && value >= 0.55 && value <= 0.92) {
      whiteMildewPixels++;
    }
  }

  if (totalLeafPixels === 0) {
    return { isPlant: false, chromaticRatio: 0, damagePercent: 0, severity: 'Unknown', reason: 'no_leaf_pixels' };
  }

  const chromaticPixels =
    healthyGreenPixels + yellowChloroticPixels + orangeRustPixels + brownNecroticPixels;
  const chromaticRatio = chromaticPixels / totalLeafPixels;

  if (chromaticRatio <= CHROMATIC_THRESHOLD) {
    return {
      isPlant: false,
      chromaticRatio: Number(chromaticRatio.toFixed(2)),
      damagePercent: 0,
      severity: 'Unknown',
      reason: 'low_chromatic_ratio',
    };
  }

  const damagedPixels =
    brownNecroticPixels + blackSpotPixels + whiteMildewPixels + orangeRustPixels + yellowChloroticPixels;
  const damagePercent = Math.min(100, (damagedPixels / totalLeafPixels) * 100);

  return {
    isPlant: true,
    chromaticRatio: Number(chromaticRatio.toFixed(2)),
    damagePercent: Number(damagePercent.toFixed(1)),
    severity: classifySeverity(damagePercent),
    healthyGreenPixels,
    damagedPixels,
    totalLeafPixels,
  };
}