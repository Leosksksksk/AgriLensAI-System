// src/screens/ResultsScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SeverityRing from '../components/SeverityRing';
import { useLanguage } from '../context/LanguageContext';
import { getDiseaseProfile } from '../utils/diseaseCatalog';

const PROGRESSION_STAGES = [
  { labelKey: 'progSevereDamage', color: '#D32F2F', threshold: 70 },
  { labelKey: 'progSpreadStems', color: colors.warning, threshold: 40 },
  { labelKey: 'progModerateSpots', color: '#FBC02D', threshold: 15 },
  { labelKey: 'progSlightDiscoloration', color: colors.ok, threshold: 0 },
];

export default function ResultsScreen({ route, navigation }) {
  const { t } = useLanguage();

  const [playing, setPlaying] = useState(false);

  // ScanScreen sends the real diagnosis object here — this replaces the
  // old route.params.disease/severity, which no longer exist.
  const diagnosis = route?.params?.diagnosis ?? {
    diseaseId: 'healthy',
    damagePercent: 0,
    severity: 'None',
    confidence: 0.5,
  };
  const cropLabel = route?.params?.cropLabel ?? t('defaultCropLabel');

  const profile = getDiseaseProfile(diagnosis.diseaseId);
  const diseaseName = t(profile.nameKey);
  const diseaseDesc = t(profile.descKey);
  const severityLabel = t(`severity${diagnosis.severity}`);

  const activeStage = PROGRESSION_STAGES.find((s) => diagnosis.damagePercent >= s.threshold);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('scanResults')}</Text>
        <View style={styles.cropPill}>
          <Text style={styles.cropPillText}>{cropLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <SeverityRing
              percent={diagnosis.damagePercent}
              color={colors.warning}
              label={severityLabel}
            />
          </View>
          <Text style={styles.diseaseLabel}>{diseaseName}</Text>
          <Text style={styles.diseaseDesc}>{diseaseDesc}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>{Math.round(diagnosis.confidence * 100)}%</Text>
          </View>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: `${diagnosis.confidence * 100}%` }]} />
          </View>
        </View>

        {diagnosis.diseaseId !== 'healthy' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('diseaseProgression')}</Text>
            {PROGRESSION_STAGES.slice().reverse().map((stage, i) => {
              const isActive = activeStage?.labelKey === stage.labelKey;
              return (
                <View key={i} style={styles.progressionRow}>
                  <View style={[styles.dot, { backgroundColor: stage.color }]} />
                  <Text style={[styles.progressionLabel, isActive && styles.progressionActive]}>
                    {t(stage.labelKey)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.audioBar}
          activeOpacity={0.85}
          onPress={() => setPlaying((p) => !p)}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.white} />
          <Text style={styles.audioText}>{t('listenDiagnosis')}</Text>
          <View style={styles.audioTrack}>
            <View style={[styles.audioProgress, { width: playing ? '70%' : '20%' }]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.treatmentBtn}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('TreatmentPlan', {
              diseaseId: diagnosis.diseaseId,
              damagePercent: diagnosis.damagePercent,
              cropLabel,
            })
          }
        >
          <Text style={styles.treatmentBtnText}>{t('viewTreatmentPlan')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  cropPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  cropPillText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 20, marginBottom: 16 },
  diseaseLabel: { textAlign: 'center', color: colors.warning, fontWeight: '800', fontSize: 15, marginTop: 6 },
  diseaseDesc: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confidenceLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  confidenceValue: { fontSize: 12, color: colors.textDark, fontWeight: '800' },
  confidenceTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: 8, backgroundColor: colors.primary },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginBottom: 14 },
  progressionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  progressionLabel: { fontSize: 14, color: colors.textMuted },
  progressionActive: { color: colors.textDark, fontWeight: '700' },
  audioBar: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  audioText: { color: colors.white, fontWeight: '700', fontSize: 13, flexShrink: 0 },
  audioTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  audioProgress: { height: 4, backgroundColor: colors.white, borderRadius: 2 },
  treatmentBtn: { backgroundColor: colors.leafGreen, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  treatmentBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});