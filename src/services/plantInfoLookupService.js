// src/services/plantInfoLookupService.js

const WIKI_SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

// Crop names to sanitize in summaries/URLs
const CROP_NAMES_TO_SANITIZE = ['tomato', 'potato', 'corn', 'pepper', 'maize'];

// Localized generic plant term per language
const GENERIC_PLANT_TERM = {
  en: 'plant',
  fil: 'halaman',
  ceb: 'tanom',
  tl: 'halaman',
  bis: 'tanom',
  bisaya: 'tanom',
};

/**
 * Replaces specific crop names with localized generic plant term in text
 */
function sanitizeCropNames(text, language = 'en') {
  if (!text) return text;
  const genericTerm = GENERIC_PLANT_TERM[language] || GENERIC_PLANT_TERM.en;
  let sanitized = text;
  CROP_NAMES_TO_SANITIZE.forEach(crop => {
    const regex = new RegExp(`\\b${crop}\\b`, 'gi');
    sanitized = sanitized.replace(regex, genericTerm);
  });
  return sanitized;
}

/**
 * Builds Wikipedia page title from disease ID (e.g., 'tomatoEarlyBlight' -> 'Early_blight')
 */
function buildWikiTitle(diseaseId) {
  // Remove crop prefix and convert to Wikipedia format
  const cropPrefixes = ['tomato', 'potato', 'corn', 'pepper'];
  let diseasePart = diseaseId;
  for (const prefix of cropPrefixes) {
    if (diseaseId.toLowerCase().startsWith(prefix)) {
      diseasePart = diseaseId.slice(prefix.length);
      break;
    }
  }
  // Convert camelCase to snake_case for Wikipedia
  return diseasePart
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Builds dynamic Wikipedia URL from disease ID
 */
function buildWikiUrl(diseaseId) {
  const title = buildWikiTitle(diseaseId);
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

/**
 * Generates severity-aware fallback summary
 */
function generateSeverityFallback(diseaseId, severity, language = 'en') {
  const diseaseName = extractDiseaseName(diseaseId);
  const genericTerm = GENERIC_PLANT_TERM[language] || GENERIC_PLANT_TERM.en;
  
  const baseTemplates = {
    Mild: `Mild symptoms detected on the ${genericTerm}, consistent with ${diseaseName}. Early intervention can prevent progression. Monitor closely and consider preventive treatment.`,
    Moderate: `Moderate infection on the ${genericTerm}, consistent with ${diseaseName}. Damage is visible and spreading. Prompt treatment recommended to prevent severe crop loss.`,
    Severe: `Severe infection on the ${genericTerm}, consistent with ${diseaseName}. Extensive tissue damage detected. Immediate aggressive treatment required to save the crop.`,
    None: `No measurable damage detected. The ${genericTerm} appears healthy. Continue routine monitoring.`,
    Unknown: `The ${genericTerm} shows symptoms consistent with ${diseaseName}. Further examination recommended.`
  };
  
  return baseTemplates[severity] || baseTemplates.Unknown;
}

/**
 * Builds a DuckDuckGo search URL for a given crop and disease.
 */
function buildDuckDuckGoUrl(cropName, diseaseName, context = 'disease') {
  let query;
  switch (context) {
    case 'healthy':
      query = `${cropName} cultivation care`;
      break;
    case 'notPlant':
      query = 'how to photograph crop leaves for disease diagnosis';
      break;
    case 'generic':
      query = `${cropName} common plant diseases`;
      break;
    case 'disease':
    default:
      query = `${cropName} ${diseaseName} wikipedia`;
      break;
  }
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Extracts crop name from disease ID (e.g., 'tomatoEarlyBlight' -> 'tomato')
 */
function extractCropName(diseaseId) {
  if (diseaseId.startsWith('corn')) return 'corn';
  if (diseaseId.startsWith('pepper')) return 'pepper';
  if (diseaseId.startsWith('potato')) return 'potato';
  if (diseaseId.startsWith('tomato')) return 'tomato';
  return 'plant';
}

/**
 * Extracts readable disease name from disease ID (e.g., 'tomatoEarlyBlight' -> 'Early Blight')
 */
function extractDiseaseName(diseaseId) {
  const cropName = extractCropName(diseaseId);
  const diseasePart = diseaseId.slice(cropName.length);
  // Convert camelCase to space-separated
  return diseasePart
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determines the search context for a diagnosis result
 */
function getSearchContext(diagnosis) {
  if (!diagnosis.isPlant) return 'notPlant';
  if (diagnosis.diseaseId === 'healthy') return 'healthy';
  if (diagnosis.diseaseId === 'plantDiseaseOverview' || diagnosis.diseaseId === 'leafSpot') return 'generic';
  return 'disease';
}

function withReferenceContext(diagnosis, onlineInfo) {
  return {
    ...diagnosis,
    onlineInfo: {
      ...onlineInfo,
      diseaseId: diagnosis?.diseaseId || 'notPlant',
      severity: diagnosis?.severity || 'Unknown',
      damagePercent: Number.isFinite(diagnosis?.damagePercent) ? diagnosis.damagePercent : 0,
      isHealthy: diagnosis?.diseaseId === 'healthy',
      isGeneric: diagnosis?.diseaseId === 'plantDiseaseOverview' || diagnosis?.diseaseId === 'leafSpot',
    },
  };
}

// Maps disease IDs to Wikipedia page titles, expected keywords, local fallback text,
// and direct Wikipedia/DuckDuckGo URLs for offline use.
// ALL summaries use generic "plant" references - no specific crop names.
const DISEASE_LOOKUP = {
  healthy: {
    skipLookup: true,
    localFallback: 'No signs of disease detected. Leaf coloration is consistent with a healthy plant.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Plant_health',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=healthy+plant+leaf+diagnosis+wikipedia',
    offlineSummary: 'Healthy plants show vibrant green leaves without spots, discoloration, or lesions. Regular monitoring helps catch issues early.',
  },
  plantDiseaseOverview: {
    wikiTitle: 'Plant_disease',
    expectedKeywords: ['plant disease', 'pathogen', 'plant'],
    localFallback:
      'Plant diseases can be caused by fungi, bacteria, viruses, pests, or environmental stress. Color changes alone do not identify a specific disease.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Plant_disease',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=plant+disease+overview+wikipedia',
    offlineSummary: 'Plant diseases arise from fungi, bacteria, viruses, or environmental stress. Accurate diagnosis requires lab testing or expert examination.',
  },
  cornCommonRust: {
    wikiTitle: 'Common_rust_of_maize',
    expectedKeywords: ['rust', 'pustule', 'puccinia', 'maize'],
    localFallback:
      'Common rust produces raised orange-brown pustules on plant leaves. Remove heavily affected debris and monitor nearby plants for spread.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Common_rust_of_maize',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=common+rust+plant+wikipedia',
    offlineSummary: 'Caused by Puccinia sorghi. Orange-brown pustules on leaves reduce photosynthesis. Manage with resistant varieties and crop rotation.',
  },
  cornGrayLeafSpot: {
    wikiTitle: 'Gray_leaf_spot',
    expectedKeywords: ['gray leaf spot', 'cercospora', 'zeae-maydis'],
    localFallback:
      'Gray leaf spot causes long, rectangular gray or tan lesions between the veins of plant leaves, especially in warm, humid conditions.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Gray_leaf_spot',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=gray+leaf+spot+plant+wikipedia',
    offlineSummary: 'Caused by Cercospora zeae-maydis. Rectangular gray lesions between leaf veins. Thrives in humidity. Use resistant hybrids and residue management.',
  },
  cornNorthernLeafBlight: {
    wikiTitle: 'Northern_corn_leaf_blight',
    expectedKeywords: ['northern corn leaf blight', 'exserohilum', 'turcicum'],
    localFallback:
      'Northern corn leaf blight causes long, gray-green cigar-shaped lesions that expand along plant leaves. Remove infected residue and limit leaf wetness.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Northern_corn_leaf_blight',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=northern+leaf+blight+plant+wikipedia',
    offlineSummary: 'Caused by Exserohilum turcicum. Long cigar-shaped gray-green lesions. Reduces yield significantly. Rotate crops and use resistant varieties.',
  },
  pepperBacterialSpot: {
    wikiTitle: 'Bacterial_leaf_spot',
    expectedKeywords: ['bacterial leaf spot', 'xanthomonas', 'pepper'],
    localFallback:
      'Bacterial spot causes small, water-soaked lesions that can darken and develop yellow halos on plant leaves. Avoid handling wet plants and sanitize tools.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Bacterial_leaf_spot',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=bacterial+leaf+spot+plant+wikipedia',
    offlineSummary: 'Caused by Xanthomonas spp. Water-soaked spots with yellow halos. Spreads via splashing water. Use certified seed and avoid overhead irrigation.',
  },
  potatoEarlyBlight: {
    wikiTitle: 'Alternaria_solani',
    expectedKeywords: ['alternaria', 'early blight', 'concentric', 'lesion'],
    localFallback:
      'Early blight causes dark leaf spots with concentric rings, often beginning on older leaves of the plant. Remove affected foliage and avoid overhead watering.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Alternaria_solani',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=early+blight+plant+wikipedia',
    offlineSummary: 'Caused by Alternaria solani. Concentric dark spots on older leaves of the plant first. Favored by warm, wet conditions. Remove debris and rotate crops.',
  },
  potatoLateBlight: {
    wikiTitle: 'Phytophthora_infestans',
    expectedKeywords: ['phytophthora', 'late blight', 'potato'],
    localFallback:
      'Late blight can spread rapidly, causing water-soaked leaf lesions and white growth in humid weather. Remove affected plants and seek local crop guidance promptly.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Phytophthora_infestans',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=late+blight+plant+wikipedia',
    offlineSummary: 'Caused by Phytophthora infestans. Rapidly spreading water-soaked lesions with white sporulation. Devastating in cool, wet weather. Immediate action required.',
  },
  tomatoEarlyBlight: {
    wikiTitle: 'Early_blight',
    expectedKeywords: ['necrotic', 'concentric', 'lesion', 'blight', 'alternaria'],
    localFallback:
      'Early blight causes brown, target-like concentric spots and leaf necrosis, typically starting on older leaves of the plant.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Early_blight',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=early+blight+plant+wikipedia',
    offlineSummary: 'Caused by Alternaria solani. Target-like concentric rings on older leaves of the plant first. Reduces fruit quality. Mulch, stake, and avoid wet foliage.',
  },
  tomatoSeptoriaLeafSpot: {
    wikiTitle: 'Septoria_leaf_spot',
    expectedKeywords: ['septoria', 'lesion', 'spot', 'yellow', 'fungal'],
    localFallback:
      'Septoria leaf spot produces small, dark circular spots often ringed with yellow, spreading upward from lower leaves of the plant.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Septoria_leaf_spot',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=septoria+leaf+spot+plant+wikipedia',
    offlineSummary: 'Caused by Septoria lycopersici. Small dark spots with yellow halos, moving upward. Favored by rain and humidity. Remove lower leaves and mulch.',
  },
  tomatoLeafMold: {
    wikiTitle: 'Tomato_leaf_mold',
    expectedKeywords: ['mold', 'mould', 'fungal', 'humidity', 'olive'],
    localFallback:
      'Leaf mold appears as a pale, velvety fungal film on the underside of leaves, favored by high humidity.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Tomato_leaf_mold',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=leaf+mold+plant+wikipedia',
    offlineSummary: 'Caused by Passalora fulva. Velvety olive-green mold on leaf undersides. High humidity in greenhouses. Improve ventilation and reduce humidity.',
  },
  tomatoLateBlight: {
    wikiTitle: 'Phytophthora_infestans',
    expectedKeywords: ['phytophthora', 'late blight', 'tomato'],
    localFallback:
      'Late blight can spread rapidly, causing water-soaked leaf lesions and white growth in humid weather. Remove affected plants and seek local crop guidance promptly.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Phytophthora_infestans',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=late+blight+plant+wikipedia',
    offlineSummary: 'Caused by Phytophthora infestans. Water-soaked lesions with white sporulation. Explosive in cool, wet conditions. Destroy infected plants immediately.',
  },
  tomatoTargetSpot: {
    wikiTitle: 'Corynespora_cassiicola',
    expectedKeywords: ['target', 'concentric', 'lesion', 'corynespora'],
    localFallback:
      'Target spot produces brown lesions with concentric ring patterns, resembling a target, on leaves and stems of the plant.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Corynespora_cassiicola',
    duckDuckGoUrl: 'https://duckduckgo.com/?q=target+spot+plant+wikipedia',
    offlineSummary: 'Caused by Corynespora cassiicola. Concentric ring lesions on leaves and stems. Warm, humid conditions favor spread. Rotate crops and use fungicides if needed.',
  },
  notPlant: {
    skipLookup: true,
    localFallback: 'The captured photo does not appear to be a plant. This image will not sync to Supabase.',
    wikiUrl: null,
    duckDuckGoUrl: 'https://duckduckgo.com/?q=how+to+photograph+crop+leaves+for+disease+diagnosis',
    offlineSummary: 'Please photograph a single leaf against a plain background in good lighting. Avoid blurry images, soil, hands, or non-leaf objects.',
  },
};

const FETCH_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Lookup timed out')), ms)),
  ]);
}

export async function enrichDiagnosis(diagnosis, language = 'en') {
  if (!diagnosis || !diagnosis.isPlant) {
    // Non-plant: return special handling
    const notPlantEntry = DISEASE_LOOKUP.notPlant;
    const cropName = diagnosis?.cropName || 'plant';
    const duckDuckGoUrl = notPlantEntry.duckDuckGoUrl;

    return withReferenceContext(diagnosis, {
        summary: notPlantEntry.localFallback,
        sourceUrl: duckDuckGoUrl, // DDG link for photography tips
        verified: true,
        isOffline: false,
        isNonPlant: true,
      });
  }

  if (!diagnosis.diseaseId) {
    return diagnosis;
  }

  const entry = DISEASE_LOOKUP[diagnosis.diseaseId];
  if (!entry) {
    const cropName = extractCropName(diagnosis.diseaseId);
    const diseaseName = extractDiseaseName(diagnosis.diseaseId);
    const fallbackUrl = buildDuckDuckGoUrl(cropName, diseaseName, 'generic');

    return withReferenceContext(diagnosis, {
        summary: null,
        sourceUrl: fallbackUrl,
        verified: false,
        isOffline: false,
        note: 'No reference entry configured for this disease id.',
      });
  }

  // Immediately return local fallback for healthy plants to prevent 404s
  if (entry.skipLookup) {
    return withReferenceContext(diagnosis, {
        summary: entry.localFallback,
        sourceUrl: entry.wikiUrl, // Use Wikipedia URL as primary, DDG as backup
        verified: true,
        isOffline: false,
        offlineSummary: entry.offlineSummary,
        isHealthy: true,
      });
  }

  try {
    // Use dynamic Wikipedia title based on disease ID
    const wikiTitle = entry.wikiTitle || buildWikiTitle(diagnosis.diseaseId);
    const response = await withTimeout(
      fetch(WIKI_SUMMARY_ENDPOINT + encodeURIComponent(wikiTitle), {
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
    // Sanitize the Wikipedia summary to replace crop names with localized generic term
    const rawSummary = data.extract || entry.localFallback;
    const summary = sanitizeCropNames(rawSummary, language);
    // Prefer Wikipedia URL from API, fall back to our local wikiUrl
    const sourceUrl = data.content_urls?.desktop?.page || entry.wikiUrl || buildWikiUrl(diagnosis.diseaseId);

    const verified = isPlausibleMatch(summary, entry.expectedKeywords);

    const enrichedDiagnosis = {
      ...diagnosis,
      confidence: adjustConfidence(diagnosis.confidence, verified, entry.expectedKeywords.length > 0),
    };
    return withReferenceContext(enrichedDiagnosis, {
        summary,
        sourceUrl, // Always populated (Wikipedia page URL)
        verified,
        isOffline: false,
        offlineSummary: entry.offlineSummary,
      });
  } catch (e) {
    console.log('Plant info lookup offline/network error, using local fallback:', e?.message || e);
    // Offline fallback: use local summary + Wikipedia URL (or DDG as backup)
    const searchContext = getSearchContext(diagnosis);
    const cropName = extractCropName(diagnosis.diseaseId);
    const diseaseName = extractDiseaseName(diagnosis.diseaseId);
    const fallbackUrl = entry.wikiUrl || entry.duckDuckGoUrl || buildDuckDuckGoUrl(cropName, diseaseName, searchContext);

    // Generate severity-aware offline summary with localized plant term
    const severity = diagnosis.severity || 'Unknown';
    const offlineSummary = generateSeverityFallback(diagnosis.diseaseId, severity, language);

    return withReferenceContext(diagnosis, {
        summary: offlineSummary,
        sourceUrl: fallbackUrl, // Never null
        verified: null,
        isOffline: true,
        offlineSummary,
        isHealthy: diagnosis.diseaseId === 'healthy',
        isGeneric: diagnosis.diseaseId === 'plantDiseaseOverview' || diagnosis.diseaseId === 'leafSpot',
      });
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