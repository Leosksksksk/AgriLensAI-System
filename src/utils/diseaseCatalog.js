// src/utils/diseaseCatalog.js

/**
 * Static disease knowledge base. Maps a diseaseId (from aiEngineService)
 * to display name/description/mitigation translation keys.
 *
 * Tomato-specific entries (added from the "tomatoleaf" Kaggle dataset's
 * 10-class label set): tomatoEarlyBlight, tomatoSeptoriaLeafSpot,
 * tomatoLeafMold, tomatoTargetSpot are LIVE-DETECTABLE — the color
 * engine's 4 signature buckets now map directly to these.
 *
 * tomatoBacterialSpot, tomatoLateBlight, tomatoSpiderMites,
 * tomatoYellowLeafCurlVirus, tomatoMosaicVirus are REFERENCE-ONLY: real
 * agronomic data, but the color-heuristic engine cannot visually
 * distinguish them from the 4 detectable diseases above. They're kept
 * here so a future trained model (or a disease-library browse screen)
 * can use them, but analyzeLeaf() will never return these IDs today.
 *
 * The old generic ids (leafBlight, leafSpot, powderyMildew, leafRust)
 * are kept for backward compatibility with any scans already saved to
 * Supabase under those ids before this update.
 */
export const DISEASE_CATALOG = {
  healthy: {
    id: 'healthy',
    nameKey: 'diseaseHealthy',
    descKey: 'diseaseHealthyDesc',
    mitigationKeys: ['healthyTip1', 'healthyTip2'],
    urgencyRank: 5,
  },

  // ---- Live-detectable tomato diseases ----
  tomatoEarlyBlight: {
    id: 'tomatoEarlyBlight',
    nameKey: 'diseaseEarlyBlight',
    descKey: 'diseaseEarlyBlightDesc',
    mitigationKeys: ['action1', 'action2', 'action3', 'action4'],
    urgencyRank: 1,
  },
  tomatoSeptoriaLeafSpot: {
    id: 'tomatoSeptoriaLeafSpot',
    nameKey: 'diseaseSeptoria',
    descKey: 'diseaseSeptoriaDesc',
    mitigationKeys: ['septoriaAction1', 'septoriaAction2', 'septoriaAction3', 'septoriaAction4'],
    urgencyRank: 2,
  },
  tomatoLeafMold: {
    id: 'tomatoLeafMold',
    nameKey: 'diseaseTomatoLeafMold',
    descKey: 'diseaseTomatoLeafMoldDesc',
    mitigationKeys: ['tomatoLeafMoldAction1', 'tomatoLeafMoldAction2', 'tomatoLeafMoldAction3'],
    urgencyRank: 2,
  },
  tomatoTargetSpot: {
    id: 'tomatoTargetSpot',
    nameKey: 'diseaseTargetSpot',
    descKey: 'diseaseTargetSpotDesc',
    mitigationKeys: ['targetSpotAction1', 'targetSpotAction2', 'targetSpotAction3'],
    urgencyRank: 2,
  },

  // ---- Reference-only tomato diseases (not visually detectable yet) ----
  tomatoBacterialSpot: {
    id: 'tomatoBacterialSpot',
    nameKey: 'diseaseBacterialSpot',
    descKey: 'diseaseBacterialSpotDesc',
    mitigationKeys: ['bacterialSpotAction1', 'bacterialSpotAction2', 'bacterialSpotAction3'],
    urgencyRank: 1,
  },
  tomatoLateBlight: {
    id: 'tomatoLateBlight',
    nameKey: 'diseaseLateBlight',
    descKey: 'diseaseLateBlightDesc',
    mitigationKeys: ['lateBlightAction1', 'lateBlightAction2', 'lateBlightAction3'],
    urgencyRank: 1,
  },
  tomatoSpiderMites: {
    id: 'tomatoSpiderMites',
    nameKey: 'diseaseSpiderMites',
    descKey: 'diseaseSpiderMitesDesc',
    mitigationKeys: ['spiderMitesAction1', 'spiderMitesAction2', 'spiderMitesAction3'],
    urgencyRank: 3,
  },
  tomatoYellowLeafCurlVirus: {
    id: 'tomatoYellowLeafCurlVirus',
    nameKey: 'diseaseTYLCV',
    descKey: 'diseaseTYLCVDesc',
    mitigationKeys: ['tylcvAction1', 'tylcvAction2', 'tylcvAction3'],
    urgencyRank: 1,
  },
  tomatoMosaicVirus: {
    id: 'tomatoMosaicVirus',
    nameKey: 'diseaseMosaicVirus',
    descKey: 'diseaseMosaicVirusDesc',
    mitigationKeys: ['mosaicVirusAction1', 'mosaicVirusAction2', 'mosaicVirusAction3'],
    urgencyRank: 2,
  },

  // ---- Legacy generic ids (kept for old saved scans) ----
  leafBlight: {
    id: 'leafBlight',
    nameKey: 'defaultDisease',
    descKey: 'diseaseBlightDesc',
    mitigationKeys: ['action1', 'action2', 'action3', 'action4'],
    urgencyRank: 1,
  },
  leafSpot: {
    id: 'leafSpot',
    nameKey: 'diseaseLeafSpot',
    descKey: 'diseaseLeafSpotDesc',
    mitigationKeys: ['leafSpotAction1', 'leafSpotAction2', 'leafSpotAction3'],
    urgencyRank: 3,
  },
  powderyMildew: {
    id: 'powderyMildew',
    nameKey: 'diseaseMildew',
    descKey: 'diseaseMildewDesc',
    mitigationKeys: ['mildewAction1', 'mildewAction2', 'mildewAction3'],
    urgencyRank: 2,
  },
  leafRust: {
    id: 'leafRust',
    nameKey: 'diseaseRust',
    descKey: 'diseaseRustDesc',
    mitigationKeys: ['rustAction1', 'rustAction2', 'rustAction3'],
    urgencyRank: 1,
  },
};

export function getDiseaseProfile(diseaseId) {
  return DISEASE_CATALOG[diseaseId] || DISEASE_CATALOG.healthy;
}