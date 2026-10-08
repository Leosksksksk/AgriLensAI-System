// src/utils/diseaseCatalog.js

/** Maps model disease IDs to localized diagnosis and mitigation content. */
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
  tomatoLateBlight: {
    id: 'tomatoLateBlight',
    nameKey: 'diseaseLateBlight',
    descKey: 'diseaseLateBlightDesc',
    mitigationKeys: ['lateBlightAction1', 'lateBlightAction2', 'lateBlightAction3'],
    urgencyRank: 1,
  },

  cornCommonRust: {
    id: 'cornCommonRust',
    nameKey: 'diseaseRust',
    descKey: 'diseaseRustDesc',
    mitigationKeys: ['rustAction1', 'rustAction2', 'rustAction3'],
    urgencyRank: 1,
  },
  cornGrayLeafSpot: {
    id: 'cornGrayLeafSpot',
    nameKey: 'diseaseLeafSpot',
    descKey: 'diseaseLeafSpotDesc',
    mitigationKeys: ['leafSpotAction1', 'leafSpotAction2', 'leafSpotAction3'],
    urgencyRank: 2,
  },
  cornNorthernLeafBlight: {
    id: 'cornNorthernLeafBlight',
    nameKey: 'diseaseLeafBlight',
    descKey: 'diseaseBlightDesc',
    mitigationKeys: ['action1', 'action2', 'action3', 'action4'],
    urgencyRank: 1,
  },
  pepperBacterialSpot: {
    id: 'pepperBacterialSpot',
    nameKey: 'diseaseBacterialSpot',
    descKey: 'diseaseBacterialSpotDesc',
    mitigationKeys: ['bacterialSpotAction1', 'bacterialSpotAction2', 'bacterialSpotAction3'],
    urgencyRank: 1,
  },
  potatoEarlyBlight: {
    id: 'potatoEarlyBlight',
    nameKey: 'diseaseEarlyBlight',
    descKey: 'diseaseEarlyBlightDesc',
    mitigationKeys: ['action1', 'action2', 'action3', 'action4'],
    urgencyRank: 1,
  },
  potatoLateBlight: {
    id: 'potatoLateBlight',
    nameKey: 'diseaseLateBlight',
    descKey: 'diseaseLateBlightDesc',
    mitigationKeys: ['lateBlightAction1', 'lateBlightAction2', 'lateBlightAction3'],
    urgencyRank: 1,
  },

  // ---- Reference-only tomato diseases (not visually detectable yet) ----
  tomatoBacterialSpot: {
    id: 'tomatoBacterialSpot',
    nameKey: 'diseaseBacterialSpot',
    descKey: 'diseaseBacterialSpotDesc',
    mitigationKeys: ['bacterialSpotAction1', 'bacterialSpotAction2', 'bacterialSpotAction3'],
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