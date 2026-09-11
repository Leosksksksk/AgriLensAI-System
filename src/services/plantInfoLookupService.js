// src/services/plantInfoLookupService.js

const WIKI_SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const DISEASE_LOOKUP = {
  healthy: {
    skipLookup: true, // Bypass the API entirely for healthy plants
    localFallback: 'No signs of disease detected. Leaf coloration is consistent with a healthy plant.',
  },
  tomatoEarlyBlight: {
    title: 'Alternaria_solani',
    expectedKeywords: ['necrotic', 'concentric', 'lesion', 'blight', 'alternaria'],
    localFallback:
      'Early blight causes brown, target-like concentric spots and leaf necrosis, typically starting on older leaves.',
  },
  tomatoSeptoriaLeafSpot: {
    title: 'Septoria_lycopersici',
    expectedKeywords: ['septoria', 'lesion', 'spot', 'yellow', 'fungal'],
    localFallback:
      'Septoria leaf spot produces small, dark circular spots often ringed with yellow, spreading upward from lower leaves.',
  },
  tomatoLeafMold: {
    title: 'Tomato_leaf_mold',
    expectedKeywords: ['mold', 'mould', 'fungal', 'humidity', 'olive'],
    localFallback:
      'Leaf mold appears as a pale, velvety fungal film on the underside of leaves, favored by high humidity.',
  },
  tomatoTargetSpot: {
    title: 'Corynespora_cassiicola',
    expectedKeywords: ['target', 'concentric', 'lesion', 'corynespora'],
    localFallback:
      'Target spot produces brown lesions with concentric ring patterns, resembling a target, on leaves and stems.',
  },
};

const FETCH_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Lookup timed out')), ms)),
  ]);
}

export async function enrichDiagnosis(diagnosis) {
  if (!diagnosis || !diagnosis.isPlant || !diagnosis.diseaseId) {
    return diagnosis;
  }

  const entry = DISEASE_LOOKUP[diagnosis.diseaseId];
  if (!entry) {
    return {
      ...diagnosis,
      onlineInfo: {
        summary: null,
        sourceUrl: null,
        verified: false,
        isOffline: false,
        note: 'No reference entry configured for this disease id.',
      },
    };
  }

  // Immediately return local fallback for healthy plants to prevent 404s
  if (entry.skipLookup) {
    return {
      ...diagnosis,
      onlineInfo: {
        summary: entry.localFallback,
        sourceUrl: null,
        verified: true,
        isOffline: false,
      },
    };
  }

  try {
    const response = await withTimeout(
      fetch(WIKI_SUMMARY_ENDPOINT + encodeURIComponent(entry.title), {
        headers: {
          'User-Agent': 'AgriLensAI/1.0 (https://github.com/agrilens)',
          'Accept': 'application/json',
        },
      }),
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = await response.json();
    const summary = data.extract || entry.localFallback;
    const sourceUrl = data.content_urls?.desktop?.page || null;

    const verified = isPlausibleMatch(summary, entry.expectedKeywords);

    return {
      ...diagnosis,
      confidence: adjustConfidence(diagnosis.confidence, verified, entry.expectedKeywords.length > 0),
      onlineInfo: {
        summary,
        sourceUrl,
        verified,
        isOffline: false,
      },
    };
  } catch (e) {
    console.log('Plant info lookup offline/network error, using local fallback:', e?.message || e);
    return {
      ...diagnosis,
      onlineInfo: {
        summary: entry.localFallback,
        sourceUrl: null,
        verified: null,
        isOffline: true,
      },
    };
  }
}

function isPlausibleMatch(summaryText, expectedKeywords) {
  if (!expectedKeywords || expectedKeywords.length === 0) return true;
  const lower = summaryText.toLowerCase();
  return expectedKeywords.some((keyword) => lower.includes(keyword));
}

function adjustConfidence(baseConfidence, verified, hadKeywordsToCheck) {
  if (!hadKeywordsToCheck) return baseConfidence;
  const delta = verified ? 0.03 : -0.08;
  return Number(Math.min(0.95, Math.max(0.1, baseConfidence + delta)).toFixed(2));
}