// src/screens/ResultsScreen.js
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import SeverityRing from '../components/SeverityRing';
import { useLanguage } from '../context/LanguageContext';
import { getDiseaseProfile } from '../utils/diseaseCatalog';

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
    sanitized = sanitized.replace(regex, GENERIC_PLANT_TERM[language] || GENERIC_PLANT_TERM.en);
  });
  return sanitized;
}

const baseStyles = StyleSheet.create({
  container: { flex: 1 },
  foregroundLayer: { flex: 1, zIndex: 1, elevation: 1 },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 50 },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#082718',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 4,
  },
  diagnosisCard: { alignItems: 'center' },
  diseaseLabel: { textAlign: 'center', fontWeight: '800', fontSize: 17, marginTop: 6 },
  diseaseDesc: { textAlign: 'center', fontSize: 14, marginTop: 6, lineHeight: 19 },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  confidenceLabel: { fontSize: 14, fontWeight: '600' },
  confidenceValue: { fontSize: 14, fontWeight: '800' },
  confidenceTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: 8 },
  sectionTitle: { fontWeight: '800', fontSize: 18, marginBottom: 14 },

  onlineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  offlinePillText: { fontSize: 13, fontWeight: '600' },
  unverifiedPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  unverifiedPillText: { flex: 1, fontSize: 14, fontWeight: '600' },
  onlineSummary: { fontSize: 15, lineHeight: 21 },
  sourceLink: { 
    marginTop: 12, 
    fontSize: 13, 
    fontWeight: '700',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },

  progressionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  progressionLabel: { fontSize: 16 },
  progressionActive: { fontWeight: '700' },
  severityBadgeContainer: { marginTop: 8, alignItems: 'center' },
  severityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  severityBadgeText: { fontWeight: '800', fontSize: 15 },
  audioBar: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  audioText: { fontWeight: '700', fontSize: 15, flexShrink: 0 },
  audioTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  audioProgress: { height: 4, borderRadius: 2 },
  treatmentBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  treatmentBtnText: { fontWeight: '800', fontSize: 17 },
  webImagesSection: { marginTop: 8 },
  webImagesNote: { fontSize: 13, marginBottom: 8 },
  webImagesContainer: { paddingHorizontal: 4, gap: 8 },
  webImageWrapper: { width: 140, borderRadius: 10, overflow: 'hidden' },
  webImage: { width: 140, height: 140 },
  webImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  webImageSource: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  webSearchError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginTop: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  webSearchErrorText: { flex: 1, fontSize: 13 },
});

const PROGRESSION_STAGES = [
  { labelKey: 'progSevereDamage', color: '#D32F2F', threshold: 70 },
  { labelKey: 'progSpreadStems', color: '#F5A623', threshold: 40 },
  { labelKey: 'progModerateSpots', color: '#FBC02D', threshold: 15 },
  { labelKey: 'progSlightDiscoloration', color: '#2E7D32', threshold: 0 },
];

export default function ResultsScreen({ route, navigation }) {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const glass = isDark
    ? {
        header: 'rgba(5, 31, 32, 0.78)',
        surface: 'rgba(235, 250, 239, 0.2)',
        border: 'rgba(235, 250, 239, 0.3)',
        subtle: 'rgba(208, 241, 215, 0.1)',
      }
    : {
        header: 'rgba(5, 31, 32, 0.78)',
        surface: 'rgba(244, 251, 245, 0.82)',
        border: 'rgba(255, 255, 255, 0.58)',
        subtle: 'rgba(35, 83, 71, 0.1)',
      };

  const styles = {
    ...baseStyles,
    webImageWrapper: { ...baseStyles.webImageWrapper, backgroundColor: colors.border, borderWidth: 1, borderColor: glass.border },
    webImageSource: { ...baseStyles.webImageSource, color: colors.white },
    webSearchError: { ...baseStyles.webSearchError },
    webSearchErrorText: { ...baseStyles.webSearchErrorText, color: colors.textDark },
  };

  const [playing, setPlaying] = useState(false);

  const routeDiagnosis = route?.params?.diagnosis ?? {
    diseaseId: 'healthy',
    damagePercent: 0,
    severity: 'None',
    confidence: 0.5,
    onlineInfo: null,
    isPlant: true, // default to true for backwards compatibility
  };

  // Check if this is a non-plant detection
  const isNonPlant = routeDiagnosis.isPlant === false || routeDiagnosis.diseaseId === 'notPlant';

  const isUnknownCrop = routeDiagnosis.diseaseId === 'unknownCrop';
  const diseaseId = isNonPlant ? 'notPlant' : isUnknownCrop ? 'leafSpot' : routeDiagnosis.diseaseId;
  const estimatedDamage = Number.isFinite(routeDiagnosis.damagePercent)
    ? Math.max(0, Math.min(100, routeDiagnosis.damagePercent))
    : 0;
  const diagnosis = {
    ...routeDiagnosis,
    diseaseId,
    damagePercent: estimatedDamage,
    confidence: Number.isFinite(routeDiagnosis.confidence)
      ? Math.max(0, Math.min(1, routeDiagnosis.confidence))
      : 0,
    severity: ['None', 'Mild', 'Moderate', 'Severe'].includes(routeDiagnosis.severity)
      ? routeDiagnosis.severity
      : estimatedDamage >= 40 ? 'Severe' : estimatedDamage >= 15 ? 'Moderate' : estimatedDamage > 0 ? 'Mild' : 'None',
  };
  const profile = getDiseaseProfile(diseaseId);
  const isHealthyResult = diagnosis.diseaseId === 'healthy';
  const hasDamageEstimate = true;
  const hasEstimatedDiscoloration = hasDamageEstimate && diagnosis.damagePercent > 0;
  const healthyWithDiscoloration = isHealthyResult && hasEstimatedDiscoloration;
  
  // Handle non-plant case
  const diseaseName = isNonPlant
    ? 'Not a Plant'
    : healthyWithDiscoloration
      ? t('estimatedDiscolorationTitle')
      : t(profile.nameKey);
  const diseaseDesc = isNonPlant
    ? 'The captured photo does not appear to be a plant. This image will not sync to Supabase.'
    : healthyWithDiscoloration
      ? t('estimatedDiscolorationDesc').replace('{percent}', diagnosis.damagePercent.toFixed(1))
      : t(profile.descKey);
  const severityLabel = t(`severity${diagnosis.severity}`);
  const translateReference = (key, values = {}) => Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    t(key)
  );
  
  // Helper to generate dynamic Wikipedia URL from diseaseId
  const buildDynamicWikiUrl = (diseaseId) => {
    const cropPrefixes = ['tomato', 'potato', 'corn', 'pepper'];
    let diseasePart = diseaseId;
    for (const prefix of cropPrefixes) {
      if (diseaseId.toLowerCase().startsWith(prefix)) {
        diseasePart = diseaseId.slice(prefix.length);
        break;
      }
    }
    const title = diseasePart
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  };

  // Online info is now completely independent from the top card description
  const onlineInfo = {
    ...diagnosis.onlineInfo,
    // Use dynamic summary from API/local fallback; this is now completely separate from diseaseDesc
    summary: diagnosis.onlineInfo?.summary,
    // sourceUrl: dynamically generated from diseaseId if not provided by enrichment
    sourceUrl: diagnosis.onlineInfo?.sourceUrl || buildDynamicWikiUrl(diseaseId),
    verified: diagnosis.onlineInfo?.verified ?? null,
    isOffline: diagnosis.onlineInfo?.isOffline ?? false,
    isNonPlant: diagnosis.onlineInfo?.isNonPlant ?? isNonPlant,
    isHealthy: diagnosis.onlineInfo?.isHealthy ?? isHealthyResult,
    isGeneric: diagnosis.onlineInfo?.isGeneric ?? false,
    offlineSummary: diagnosis.onlineInfo?.offlineSummary,
  };
  const [localizedSummary, setLocalizedSummary] = useState('');

  useEffect(() => {
    let isActive = true;
    const summary = onlineInfo.summary;
    const targetLanguage = language === 'fil' ? 'tl' : language === 'ceb' ? 'ceb' : 'en';

    if (!summary) {
      setLocalizedSummary('');
      return () => {
        isActive = false;
      };
    }

    // Sanitize crop names from online summary BEFORE translation
    const sanitizedSummary = sanitizeCropNames(summary, language);

    if (targetLanguage === 'en' || onlineInfo.isOffline) {
      setLocalizedSummary(sanitizedSummary);
      return () => {
        isActive = false;
      };
    }

    async function translateSummary() {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(sanitizedSummary)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Translation failed with status ${response.status}`);
        const data = await response.json();
        const translatedText = data[0].map((item) => item[0]).join('');
        if (isActive) setLocalizedSummary(translatedText || sanitizedSummary);
      } catch (error) {
        if (isActive) setLocalizedSummary(sanitizedSummary);
        console.warn('Reference summary translation failed:', error);
      }
    }

    translateSummary();
    return () => {
      isActive = false;
    };
  }, [onlineInfo.summary, onlineInfo.isOffline, language]);

  // Generate context-aware fallback summary for Reference Info card
  // Uses translation function t() for dynamic language switching
  const getReferenceFallback = () => {
    if (onlineInfo.isNonPlant) {
      return t('referenceFallbackNonPlant');
    }
    if (onlineInfo.isHealthy && !healthyWithDiscoloration) {
      return t('referenceFallbackHealthy');
    }
    if (onlineInfo.isGeneric || healthyWithDiscoloration) {
      return translateReference('referenceFallbackGeneric', { cropName: diagnosis.cropName || t('cropPlant') });
    }
    // Specific disease detected — use severity-aware fallback
    const severity = diagnosis.severity || 'Unknown';
    const cropName = diagnosis.cropName || t('cropPlant');
    switch (severity) {
      case 'Mild':
        return translateReference('referenceFallbackDiseaseMild', { cropName, diseaseName });
      case 'Moderate':
        return translateReference('referenceFallbackDiseaseModerate', { cropName, diseaseName });
      case 'Severe':
        return translateReference('referenceFallbackDiseaseSevere', { cropName, diseaseName });
      default:
        return translateReference('referenceFallbackDisease', { cropName });
    }
  };

  const referenceBaseSummary = onlineInfo.isOffline
    ? getReferenceFallback()
    : localizedSummary || onlineInfo.offlineSummary || getReferenceFallback();
  const referenceSeverity = diagnosis.severity || onlineInfo.severity;
  const referenceSeverityGuidance = isNonPlant
    ? ''
    : healthyWithDiscoloration
      ? translateReference(`referenceDiscoloration${referenceSeverity}`, {
          percent: diagnosis.damagePercent.toFixed(1),
          severity: t(`severity${referenceSeverity}`).toLowerCase(),
        })
      : ['None', 'Mild', 'Moderate', 'Severe'].includes(referenceSeverity)
        ? translateReference(`referenceSeverity${referenceSeverity}`, {
            diseaseName,
            cropName: diagnosis.cropName || t('cropPlant'),
          })
        : '';
  const referenceSummary = [referenceBaseSummary, referenceSeverityGuidance]
    .filter(Boolean)
    .join('\n\n');

  const activeStage = PROGRESSION_STAGES.find((s) => diagnosis.damagePercent >= s.threshold);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Mild': return '#FBC02D';
      case 'Moderate': return colors.warning;
      case 'Severe': return '#D32F2F';
      default: return colors.textMuted;
    }
  };

  const conditionLabel = isNonPlant
      ? t('notAPlantTitle')
      : isHealthyResult && !hasEstimatedDiscoloration
        ? t('conditionNormal')
        : severityLabel;
  const resultColor = isNonPlant
      ? colors.textMuted
      : isHealthyResult && !hasEstimatedDiscoloration
        ? colors.ok
        : getSeverityColor(diagnosis.severity);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleToggleAudio = async () => {
    const isCurrentlySpeaking = await Speech.isSpeakingAsync();

    if (playing || isCurrentlySpeaking) {
      await Speech.stop();
      setPlaying(false);
    } else {
      const textToRead = `${diseaseName}. ${diseaseDesc}`;

      let speechLang = 'en-US';
      if (language === 'ceb' || language === 'bis' || language === 'fil') {
        speechLang = 'fil-PH';
      }

      const availableVoices = await Speech.getAvailableVoicesAsync();
      const maleVoice = availableVoices.find(
        (v) =>
          v.language.startsWith(speechLang.slice(0, 2)) &&
          (v.name.toLowerCase().includes('male') ||
           v.identifier.toLowerCase().includes('male') ||
           v.name.toLowerCase().includes('guy') ||
           v.name.toLowerCase().includes('es-es-x-sfd') ||
           v.identifier.toLowerCase().includes('m03'))
      );

      setPlaying(true);

      Speech.speak(textToRead, {
        language: speechLang,
        voice: maleVoice ? maleVoice.identifier : undefined,
        pitch: 1.2, 
        rate: 0.90, 
        onDone: () => setPlaying(false),
        onStopped: () => setPlaying(false),
        onError: () => setPlaying(false),
      });
    }
  };

  const handleOpenSourceUrl = async (sourceUrl) => {
    if (!sourceUrl) return;
    
    // Detect if URL is DuckDuckGo (which handles language internally)
    const isDuckDuckGo = sourceUrl.includes('duckduckgo.com');
    
    let targetLang = 'en'; 
    if (language === 'fil' || language === 'tl' || language === 'filipino') targetLang = 'tl';
    else if (language === 'bis' || language === 'ceb' || language === 'bisaya') targetLang = 'ceb';

    // Skip Google Translate wrapper for DuckDuckGo (it handles language internally)
    // Also skip for non-English Wikipedia (we could use the language-specific wiki)
    const finalUrl = (targetLang === 'en' || isDuckDuckGo) 
      ? sourceUrl 
      : `https://translate.google.com/translate?sl=en&tl=${targetLang}&u=${encodeURIComponent(sourceUrl)}`;

    try {
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.foregroundLayer}>
        <View style={[styles.header, { backgroundColor: glass.header, borderBottomColor: glass.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.white }]}>{t('scanResults')}</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, styles.diagnosisCard, { backgroundColor: glass.surface, borderColor: glass.border }]}>
          {/* Hide SeverityRing for non-plant detection */}
          {!isNonPlant && hasDamageEstimate && (
            <SeverityRing
              percent={diagnosis.damagePercent}
              color={isHealthyResult && !hasEstimatedDiscoloration ? colors.ok : getSeverityColor(diagnosis.severity)}
              label={severityLabel}
            />
          )}
          <View style={styles.severityBadgeContainer}>
            <View style={[styles.severityBadge, { backgroundColor: resultColor }]}>
              <Text style={[styles.severityBadgeText, { color: colors.white }]}>
                {conditionLabel.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.diseaseLabel, { color: resultColor }]}>{diseaseName}</Text>
          <Text style={[styles.diseaseDesc, { color: colors.textMuted }]}>{diseaseDesc}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: glass.surface, borderColor: glass.border }]}>
          <View style={styles.confidenceRow}>
            <Text style={[styles.confidenceLabel, { color: colors.textMuted }]}>Confidence</Text>
            <Text style={[styles.confidenceValue, { color: colors.textDark }]}>{Math.round(diagnosis.confidence * 100)}%</Text>
          </View>
          <View style={[styles.confidenceTrack, { backgroundColor: glass.subtle }]}>
            <View style={[styles.confidenceFill, { width: `${diagnosis.confidence * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {!!onlineInfo && (
          <View style={[styles.card, { backgroundColor: glass.surface, borderColor: glass.border }]}>
            <View style={styles.onlineHeaderRow}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('referenceInfoTitle')}</Text>
            </View>

            {onlineInfo.isOffline && (
              <View style={styles.offlinePill}>
                <Ionicons name="cloud-offline-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.offlinePillText, { color: colors.textMuted }]}>{t('referenceInfoOffline')}</Text>
              </View>
            )}

            {onlineInfo.verified === false && (
              <View style={styles.unverifiedPill}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={[styles.unverifiedPillText, { color: colors.textDark }]}>{t('referenceInfoUnverified')}</Text>
              </View>
            )}

            {/* Reference Info now uses completely independent summary from onlineInfo */}
            <Text style={[styles.onlineSummary, { color: colors.textMuted }]}>
              {referenceSummary}
            </Text>

            {/* Show non-plant specific guidance if applicable */}
            {onlineInfo.isNonPlant && (
              <Text style={[styles.onlineSummary, { color: colors.textMuted, marginTop: 8 }]}>
                {t('referenceNonPlantTip')}
              </Text>
            )}

            {/* Always show View Source link - it now points to context-appropriate URLs */}
            {!!onlineInfo.sourceUrl && (
              <TouchableOpacity 
                onPress={() => handleOpenSourceUrl(onlineInfo.sourceUrl)}
                style={{ marginTop: 12, paddingBottom: 4 }}
              >
                <Text style={[styles.sourceLink, { color: colors.primary }]}>
                  {t('referenceInfoSourceLink')}
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Text>
              </TouchableOpacity>
            )}

            {diagnosis.webReferenceImages && diagnosis.webReferenceImages.length > 0 && (
              <View style={styles.webImagesSection}>
                <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 16 }]}>{t('webReferenceImages')}</Text>
                <Text style={[styles.webImagesNote, { color: colors.textMuted }]}>{diagnosis.webSearchNote}</Text>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.webImagesContainer}>
                  {diagnosis.webReferenceImages.map((img, idx) => (
                    <TouchableOpacity key={idx} style={styles.webImageWrapper} onPress={() => Linking.openURL(img.url)}>
                      <Image
                        source={{ uri: img.url }}
                        style={styles.webImage}
                        resizeMode="cover"
                      />
                      <View style={styles.webImageOverlay}>
                        <Text style={styles.webImageSource}>{img.source}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {diagnosis.webSearchError && (
              <View style={styles.webSearchError}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.webSearchErrorText}>{diagnosis.webSearchError}</Text>
              </View>
            )}
          </View>
        )}

        {hasDamageEstimate && !isNonPlant && !isHealthyResult && (
          <View style={[styles.card, { backgroundColor: glass.surface, borderColor: glass.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('diseaseProgression')}</Text>
            {PROGRESSION_STAGES.slice().reverse().map((stage, i) => {
              const isActive = activeStage?.labelKey === stage.labelKey;
              return (
                <View key={i} style={styles.progressionRow}>
                  <View style={[styles.dot, { backgroundColor: stage.color }]} />
                  <Text style={[styles.progressionLabel, isActive && styles.progressionActive, { color: isActive ? colors.textDark : colors.textMuted }]}>
                    {t(stage.labelKey)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.audioBar, { backgroundColor: colors.primary }]}
          activeOpacity={0.40}
          onPress={handleToggleAudio}
        >
          <Ionicons name={playing ? 'square' : 'play'} size={22} color={isDark ? '#051F20' : colors.white} />
          <Text style={[styles.audioText, { color: isDark ? '#051F20' : colors.white }]}>{t('listenDiagnosis')}</Text>
          <View style={[styles.audioTrack, { backgroundColor: isDark ? 'rgba(5, 31, 32, 0.28)' : 'rgba(255,255,255,0.4)' }]}>
            <View style={[styles.audioProgress, { width: playing ? '100%' : '0%' }, { backgroundColor: isDark ? '#051F20' : colors.white }]} />
          </View>
        </TouchableOpacity>

        {!isNonPlant && (
          <TouchableOpacity
            style={[styles.treatmentBtn, { backgroundColor: colors.leafGreen }]}
            activeOpacity={0.85}
            onPress={() => {
              Speech.stop();
              navigation.navigate('TreatmentPlan', {
                diseaseId: diagnosis.diseaseId,
                damagePercent: diagnosis.damagePercent,
              });
            }}
          >
            <Text style={[styles.treatmentBtnText, { color: isDark ? '#051F20' : colors.white }]}>{t('viewTreatmentPlan')}</Text>
          </TouchableOpacity>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}