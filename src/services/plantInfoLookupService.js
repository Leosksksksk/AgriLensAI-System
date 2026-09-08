// src/services/plantInfoLookupService.js

/**
 * Enrichment + plausibility layer for the on-device color-heuristic
 * classifier in aiEngineService.js.
 *
 * IMPORTANT — what this does and does not do:
 * aiEngineService.analyzeLeaf() is a color-histogram heuristic, not a
 * trained vision model. It cannot re-examine the photo, so an online
 * lookup CANNOT correct a wrong classification and CANNOT guarantee
 * 100% accuracy — no lookup step can, since it never sees the leaf.
 * What it CAN do, and what this service does:
 *   1. Attach a real, current, sourced description of the matched
 *      disease (symptoms, causes, management) instead of a static
 *      blurb baked into the app.
 *   2. Run a lightweight plausibility check: does the fetched
 *      description even mention the kind of symptoms this disease is
 *      known for? If not, flag the result as "unverified" instead of
 *      presenting it with false confidence.
 *   3. Degrade gracefully offline (matches the fallback pattern already
 *      used in weatherService.js).
 */

// Wikipedia REST API needs no API key, so this works out of the box.
// Swap WIKI_TITLES for a dedicated plant-pathology API (e.g. an
// agricultural extension API) later if you get access to one with a
// richer / more authoritative dataset than a general encyclopedia.
const WIKI_SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const DISEASE_LOOKUP = {
  healthy: {
    title: 'Plant health',
    expectedKeywords: [],
    localFallback: 'No signs of disease detected. Leaf coloration is consistent with a healthy plant.',
  },
  tomatoEarlyBlight: {
    title: 'Early blight',
    expectedKeywords: ['necrotic', 'concentric', 'lesion', 'blight', 'alternaria'],
    localFallback:
      'Early blight causes brown, target-like concentric spots and leaf necrosis, typically starting on older leaves.',
  },
  tomatoSeptoriaLeafSpot: {
    title: 'Septoria leaf spot',
    expectedKeywords: ['septoria', 'lesion', 'spot', 'yellow', 'fungal'],
    localFallback:
      'Septoria leaf spot produces small, dark circular spots often ringed with yellow, spreading upward from lower leaves.',
  },
  tomatoLeafMold: {
    title: 'Tomato leaf mold',
    expectedKeywords: ['mold', 'mould', 'fungal', 'humidity', 'olive'],
    localFallback:
      'Leaf mold appears as a pale, velvety fungal film on the underside of leaves, favored by high humidity.',
  },
  tomatoTargetSpot: {
    title: 'Target spot (plant disease)',
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

/**
 * Fetches a real reference summary for the given disease id and checks
 * it for expected symptom language, then merges the result into the
 * diagnosis object returned by aiEngineService.analyzeLeaf().
 *
 * @param {object} diagnosis - the object returned by analyzeLeaf()
 * @returns {Promise<object>} diagnosis, extended with an `onlineInfo` field
 */
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
      // Nudge confidence slightly rather than overriding it — the
      // photo-based classification is still the primary signal.
      confidence: adjustConfidence(diagnosis.confidence, verified, entry.expectedKeywords.length > 0),
      onlineInfo: {
        summary,
        sourceUrl,
        verified,
        isOffline: false,
      },
    };
  } catch (e) {
    // Log silently to developer console to prevent triggering UI warning toasts
    console.log('Plant info lookup offline/network error, using local fallback:', e?.message || e);
    return {
      ...diagnosis,
      onlineInfo: {
        summary: entry.localFallback,
        sourceUrl: null,
        verified: null, // unknown — couldn't check, not confirmed false
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
  if (!hadKeywordsToCheck) return baseConfidence; // e.g. "healthy" - nothing to verify against
  const delta = verified ? 0.03 : -0.08;
  return Number(Math.min(0.95, Math.max(0.1, baseConfidence + delta)).toFixed(2));
}