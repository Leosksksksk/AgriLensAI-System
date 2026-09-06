// src/utils/diseaseCatalog.js

/**
 * Static disease knowledge base. Maps a diseaseId (from aiEngineService)
 * to display name/description/mitigation translation keys.
 */
export const DISEASE_CATALOG = {
  healthy: {
    id: 'healthy',
    nameKey: 'diseaseHealthy',
    descKey: 'diseaseHealthyDesc',
    mitigationKeys: ['healthyTip1', 'healthyTip2'],
    urgencyRank: 5,
  },
  leafBlight: {
    id: 'leafBlight',
    nameKey: 'defaultDisease', // "Early Blight" — key already exists
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