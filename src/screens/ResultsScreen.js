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
  sourceLink: { marginTop: 10, fontSize: 14, fontWeight: '700' },

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

  const diagnosis = route?.params?.diagnosis ?? {
    diseaseId: 'healthy',
    damagePercent: 0,
    severity: 'None',
    confidence: 0.5,
    onlineInfo: null,
  };

  const profile = getDiseaseProfile(diagnosis.diseaseId);
  const isHealthyResult = diagnosis.diseaseId === 'healthy';
  const hasDamageEstimate = Number.isFinite(diagnosis.damagePercent);
  const diseaseName = t(isHealthyResult ? 'conditionNormal' : profile.nameKey);
  const diseaseDesc = t(profile.descKey);
  const severityLabel = t(`severity${diagnosis.severity}`);
  const onlineInfo = diagnosis.onlineInfo;

  const activeStage = PROGRESSION_STAGES.find((s) => diagnosis.damagePercent >= s.threshold);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Mild': return '#FBC02D';
      case 'Moderate': return colors.warning;
      case 'Severe': return '#D32F2F';
      default: return colors.textMuted;
    }
  };

  const [localizedSummary, setLocalizedSummary] = useState(onlineInfo?.summary || '');

  useEffect(() => {
    async function translateSummary() {
      if (!onlineInfo?.summary) return;

      let targetLang = 'en';
      if (language === 'fil' || language === 'tl' || language === 'filipino') targetLang = 'tl';
      else if (language === 'bis' || language === 'ceb' || language === 'bisaya') targetLang = 'ceb';

      if (targetLang === 'en') {
        setLocalizedSummary(onlineInfo.summary);
        return;
      }

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(onlineInfo.summary)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const translatedText = data[0].map((item) => item[0]).join('');
        setLocalizedSummary(translatedText);
      } catch (error) {
        console.error("Translation error:", error);
        setLocalizedSummary(onlineInfo.summary);
      }
    }

    translateSummary();
  }, [onlineInfo?.summary, language]);

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
//horizontal scrolabble gallery below the wikipedia link
    let targetLang = 'en'; 
    if (language === 'fil' || language === 'tl' || language === 'filipino') targetLang = 'tl';
    else if (language === 'bis' || language === 'ceb' || language === 'bisaya') targetLang = 'ceb';

    const finalUrl = targetLang === 'en' 
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
          {hasDamageEstimate && (
            <SeverityRing
              percent={diagnosis.damagePercent}
              color={isHealthyResult ? colors.ok : colors.warning}
              label={severityLabel}
            />
          )}
          {diagnosis.diseaseId !== 'healthy' && diagnosis.severity !== 'Unknown' && (
            <View style={styles.severityBadgeContainer}>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(diagnosis.severity) }]}>
                <Text style={[styles.severityBadgeText, { color: colors.white }]}>
                  {t(`severity${diagnosis.severity}`).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <Text style={[styles.diseaseLabel, { color: isHealthyResult ? colors.ok : colors.warning }]}>{diseaseName}</Text>
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

        {onlineInfo && (
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

            {!!localizedSummary && (
              <Text style={[styles.onlineSummary, { color: colors.textMuted }]}>{localizedSummary}</Text>
            )}

            {!!onlineInfo.sourceUrl && (
              <TouchableOpacity onPress={() => handleOpenSourceUrl(onlineInfo.sourceUrl)}>
                <Text style={[styles.sourceLink, { color: colors.primary }]}>{t('referenceInfoSourceLink')}</Text>
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

        {diagnosis.diseaseId !== 'healthy' && hasDamageEstimate && (
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

        <TouchableOpacity
          style={[styles.treatmentBtn, { backgroundColor: colors.leafGreen }]}
          activeOpacity={0.85}
          onPress={() => {
            Speech.stop();
            navigation.navigate('TreatmentPlan', {
              diseaseId: diagnosis.diseaseId,
              damagePercent: hasDamageEstimate ? diagnosis.damagePercent : null,
            });
          }}
        >
          <Text style={[styles.treatmentBtnText, { color: isDark ? '#051F20' : colors.white }]}>{t('viewTreatmentPlan')}</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}