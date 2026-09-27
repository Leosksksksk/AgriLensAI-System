// src/screens/ResultsScreen.js
import { supabase } from '../../supabaseClient'; // Adjust path if necessary
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../context/ThemeContext';
import SeverityRing from '../components/SeverityRing';
import { useLanguage } from '../context/LanguageContext';
import { getDiseaseProfile } from '../utils/diseaseCatalog';

export default function ResultsScreen({ route, navigation }) {
  const { t, language } = useLanguage();
  const { colors } = useTheme();

  const PROGRESSION_STAGES = [
    { labelKey: 'progSevereDamage', color: '#D32F2F', threshold: 70 },
    { labelKey: 'progSpreadStems', color: '#F5A623', threshold: 40 },
    { labelKey: 'progModerateSpots', color: '#FBC02D', threshold: 15 },
    { labelKey: 'progSlightDiscoloration', color: '#2E7D32', threshold: 0 },
  ];

  const [playing, setPlaying] = useState(false);

  const diagnosis = route?.params?.diagnosis ?? {
    diseaseId: 'healthy',
    damagePercent: 0,
    severity: 'None',
    confidence: 0.5,
    onlineInfo: null,
  };

  const cropLabel = 'Crop'; // For database saving only, not displayed
  
  const profile = getDiseaseProfile(diagnosis.diseaseId);
  const diseaseName = t(profile.nameKey);
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

  // NEW: Save the dynamic scan results to Supabase history when the screen loads
  useEffect(() => {
    async function saveScanToHistory() {
      // Prevent saving if the screen loaded without real diagnosis params
      if (!route?.params?.diagnosis) return;

      try {
        const { error } = await supabase
          .from('scan_results')
          .insert([
            {
              // Uses the actual crop name passed to this screen!
              crop_name: cropLabel, 
              // Uses the exact disease the AI detected
              disease_id: diagnosis.diseaseId, 
              // Uses the exact severity percentage
              damage_percent: diagnosis.damagePercent, 
              status: "Analysis Complete",
            }
          ]);

        if (error) {
          console.error("Error saving scan to history:", error);
        } else {
          console.log("Successfully saved dynamic scan to Supabase!");
        }
      } catch (err) {
        console.error("Supabase insert failed:", err);
      }
    }

    saveScanToHistory();
  }, [route?.params?.diagnosis, diagnosis]); 

  // NEW: State to hold the translated summary text
  const [localizedSummary, setLocalizedSummary] = useState(onlineInfo?.summary || '');

  // NEW: Automatically translate the summary text when the screen loads
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
        // Use Google's free translation endpoint
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(onlineInfo.summary)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Combine the translated sentence chunks
        const translatedText = data[0].map((item) => item[0]).join('');
        setLocalizedSummary(translatedText);
      } catch (error) {
        console.error("Translation error:", error);
        setLocalizedSummary(onlineInfo.summary); // Fallback to English if it fails
      }
    }

    translateSummary();
  }, [onlineInfo?.summary, language]);

  // Stop audio playback if the user leaves this screen
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
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.white }]}>{t('scanResults')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <SeverityRing
              percent={diagnosis.damagePercent}
              color={colors.warning}
              label={severityLabel}
            />
          </View>
          {diagnosis.diseaseId !== 'healthy' && (
            <View style={styles.severityBadgeContainer}>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(diagnosis.severity) }]}>
                <Text style={[styles.severityBadgeText, { color: colors.white }]}>
                  {t(`severity${diagnosis.severity}`).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <Text style={[styles.diseaseLabel, { color: colors.warning }]}>{diseaseName}</Text>
          <Text style={[styles.diseaseDesc, { color: colors.textMuted }]}>{diseaseDesc}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.confidenceRow}>
            <Text style={[styles.confidenceLabel, { color: colors.textMuted }]}>Confidence</Text>
            <Text style={[styles.confidenceValue, { color: colors.textDark }]}>{Math.round(diagnosis.confidence * 100)}%</Text>
          </View>
          <View style={[styles.confidenceTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.confidenceFill, { width: `${diagnosis.confidence * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {onlineInfo && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.onlineHeaderRow}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('referenceInfoTitle')}</Text>
            </View>

            {onlineInfo.isOffline && (
              <View style={[styles.offlinePill, { backgroundColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.offlinePillText, { color: colors.textMuted }]}>{t('referenceInfoOffline')}</Text>
              </View>
            )}

            {onlineInfo.verified === false && (
              <View style={[styles.unverifiedPill, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={[styles.unverifiedPillText, { color: colors.textDark }]}>{t('referenceInfoUnverified')}</Text>
              </View>
            )}

            {/* Display the locally translated summary instead of the raw English one */}
            {!!localizedSummary && (
              <Text style={[styles.onlineSummary, { color: colors.textMuted }]}>{localizedSummary}</Text>
            )}

            {!!onlineInfo.sourceUrl && (
              <TouchableOpacity onPress={() => handleOpenSourceUrl(onlineInfo.sourceUrl)}>
                <Text style={[styles.sourceLink, { color: colors.primary }]}>{t('referenceInfoSourceLink')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {diagnosis.diseaseId !== 'healthy' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
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
          <Ionicons name={playing ? 'square' : 'play'} size={22} color={colors.white} />
          <Text style={[styles.audioText, { color: colors.white }]}>{t('listenDiagnosis')}</Text>
          <View style={styles.audioTrack}>
            <View style={[styles.audioProgress, { width: playing ? '100%' : '0%' }, { backgroundColor: colors.white }]} />
          </View>
        </TouchableOpacity>

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
          <Text style={[styles.treatmentBtnText, { color: colors.white }]}>{t('viewTreatmentPlan')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  card: { borderRadius: 14, padding: 20, marginBottom: 16 },
  diseaseLabel: { textAlign: 'center', fontWeight: '800', fontSize: 17, marginTop: 6 },
  diseaseDesc: { textAlign: 'center', fontSize: 14, marginTop: 6, lineHeight: 19 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confidenceLabel: { fontSize: 14, fontWeight: '600' },
  confidenceValue: { fontSize: 14, fontWeight: '800' },
  confidenceTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: 8 },
  sectionTitle: { fontWeight: '800', fontSize: 18, marginBottom: 14 },

  onlineHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  offlinePillText: { fontSize: 13, fontWeight: '600' },
  unverifiedPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
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
});