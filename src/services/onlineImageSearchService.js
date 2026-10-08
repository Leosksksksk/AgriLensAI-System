// src/services/onlineImageSearchService.js

const DUCKDUCKGO_IMAGE_SEARCH = 'https://duckduckgo.com/';
const GOOGLE_CUSTOM_SEARCH_API = 'https://www.googleapis.com/customsearch/v1';

const DISEASE_SEARCH_TERMS = {
  cornCommonRust: ['corn common rust Puccinia sorghi leaf symptoms', 'common rust on corn leaves'],
  cornGrayLeafSpot: ['corn gray leaf spot Cercospora symptoms', 'gray leaf spot maize leaves'],
  cornNorthernLeafBlight: ['northern corn leaf blight Exserohilum turcicum symptoms'],
  pepperBacterialSpot: ['pepper bacterial spot Xanthomonas leaf symptoms'],
  potatoEarlyBlight: ['potato early blight Alternaria solani leaf symptoms'],
  potatoLateBlight: ['potato late blight Phytophthora infestans leaf symptoms'],
  tomatoEarlyBlight: ['tomato early blight Alternaria solani leaf symptoms', 'tomato early blight concentric rings'],
  tomatoSeptoriaLeafSpot: ['tomato Septoria leaf spot symptoms', 'Septoria lycopersici tomato leaves'],
  tomatoLeafMold: ['tomato leaf mold Passalora fulva', 'tomato leaf mold fuzzy underside'],
  tomatoTargetSpot: ['tomato target spot Corynespora cassiicola', 'tomato target spot concentric lesions'],
  tomatoBacterialSpot: ['tomato bacterial spot Xanthomonas', 'bacterial spot tomato leaves'],
  tomatoLateBlight: ['tomato late blight Phytophthora infestans', 'late blight tomato leaves'],
  tomatoSpiderMites: ['tomato spider mites damage', 'two-spotted spider mite tomato'],
  tomatoYellowLeafCurlVirus: ['tomato yellow leaf curl virus TYLCV', 'TYLCV tomato symptoms'],
  tomatoMosaicVirus: ['tomato mosaic virus ToMV', 'tobacco mosaic virus tomato'],
  leafBlight: ['plant leaf blight symptoms', 'leaf blight identification'],
  leafSpot: ['plant leaf spot fungal', 'leaf spot disease identification'],
  powderyMildew: ['powdery mildew plant leaves', 'white powdery mildew symptoms'],
  leafRust: ['plant leaf rust orange pustules', 'rust disease leaves'],
  healthy: ['healthy tomato plant leaves', 'healthy green plant leaves'],
};

const FETCH_TIMEOUT_MS = 10000;
const MAX_IMAGES_PER_SEARCH = 6;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

async function fetchHtml(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 AgriLensAI/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

function extractImageUrlsFromDuckDuckGo(html) {
  const imageUrls = [];
  
  const patterns = [
    /class="tile--img__img"[^>]*src="([^"]+)"/g,
    /data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    /src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*tile[^"]*"/gi,
    /"image":\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && imageUrls.length < MAX_IMAGES_PER_SEARCH) {
      let url = match[1];
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.startsWith('/')) url = 'https://duckduckgo.com' + url;
      if (url.startsWith('http') && !imageUrls.includes(url)) {
        imageUrls.push(url);
      }
    }
  }

  return imageUrls.slice(0, MAX_IMAGES_PER_SEARCH);
}

async function searchDuckDuckGoImages(query) {
  try {
    const encodedQuery = encodeURIComponent(query + ' plant disease leaf photo');
    const url = `${DUCKDUCKGO_IMAGE_SEARCH}?q=${encodedQuery}&iar=images&iax=images&ia=images`;
    
    const html = await withTimeout(fetchHtml(url), FETCH_TIMEOUT_MS);
    const imageUrls = extractImageUrlsFromDuckDuckGo(html);
    
    return imageUrls.map((url, index) => ({
      url,
      source: 'DuckDuckGo',
      query,
      rank: index + 1,
    }));
  } catch (e) {
    console.warn('DuckDuckGo image search failed:', e.message);
    return [];
  }
}

async function searchGoogleCustomSearch(query, apiKey, cx) {
  if (!apiKey || !cx) {
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: cx,
      q: query + ' plant disease leaf',
      searchType: 'image',
      num: Math.min(MAX_IMAGES_PER_SEARCH, 10),
      safe: 'active',
      imgType: 'photo',
    });
    
    const url = `${GOOGLE_CUSTOM_SEARCH_API}?${params.toString()}`;
    const response = await withTimeout(fetch(url), FETCH_TIMEOUT_MS);
    
    if (!response.ok) {
      throw new Error(`Google Search API: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.items || []).map((item, index) => ({
      url: item.link,
      source: 'Google Custom Search',
      title: item.title,
      contextLink: item.image?.contextLink,
      rank: index + 1,
    }));
  } catch (e) {
    console.warn('Google Custom Search failed:', e.message);
    return [];
  }
}

export async function searchReferenceImages(diseaseId, options = {}) {
  const { useGoogle = false, googleApiKey, googleCx, maxImages = MAX_IMAGES_PER_SEARCH } = options;
  
  const searchTerms = DISEASE_SEARCH_TERMS[diseaseId] || [`${diseaseId} plant disease`];
  const allResults = [];
  
  for (const term of searchTerms) {
    let results = [];
    
    if (useGoogle && googleApiKey && googleCx) {
      results = await searchGoogleCustomSearch(term, googleApiKey, googleCx);
    } else {
      results = await searchDuckDuckGoImages(term);
    }
    
    allResults.push(...results);
    
    if (allResults.length >= maxImages) break;
  }
  
  const uniqueResults = [];
  const seenUrls = new Set();
  
  for (const result of allResults) {
    if (!seenUrls.has(result.url) && seenUrls.size < maxImages) {
      seenUrls.add(result.url);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults.slice(0, maxImages);
}

export async function enhanceDiagnosisWithWebSearch(diagnosis, options = {}) {
  if (!diagnosis || !diagnosis.isPlant || !diagnosis.diseaseId) {
    return diagnosis;
  }
  
  if (diagnosis.diseaseId === 'healthy') {
    return {
      ...diagnosis,
      webReferenceImages: [],
      webSearchNote: 'Healthy plant - no disease reference images needed',
    };
  }
  
  try {
    const referenceImages = await searchReferenceImages(diagnosis.diseaseId, options);
    
    return {
      ...diagnosis,
      webReferenceImages: referenceImages,
      webSearchPerformed: true,
      webSearchTimestamp: Date.now(),
      webSearchNote: referenceImages.length > 0 
        ? `Found ${referenceImages.length} reference images online` 
        : 'No reference images found online',
    };
  } catch (e) {
    console.warn('Web image search enhancement failed:', e.message);
    return {
      ...diagnosis,
      webReferenceImages: [],
      webSearchPerformed: false,
      webSearchError: e.message,
    };
  }
}

export function getSearchTermsForDisease(diseaseId) {
  return DISEASE_SEARCH_TERMS[diseaseId] || [`${diseaseId} plant disease`];
}