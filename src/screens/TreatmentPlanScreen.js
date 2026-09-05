// src/screens/TreatmentPlanScreen.js
// import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, severityColor } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export default function TreatmentPlanScreen({ route, navigation }) {
  const { t } = useLanguage();

  const disease = route?.params?.disease ?? t('defaultDisease');
  const severity = route?.params?.severity ?? 65;
  const cropLabel = route?.params?.cropLabel ?? t('defaultCrop');

  const ACTIONS = [t('action1'), t('action2'), t('action3'), t('action4')];

  const ORGANICS = [
    { name: t('organicBakingSodaName'), desc: t('organicBakingSodaDesc') },
    { name: t('organicNeemName'), desc: t('organicNeemDesc') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('treatmentPlan')}</Text>
        <View style={styles.cropPill}>
          <Text style={styles.cropPillText}>{cropLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.diseaseCard}>
          <View style={styles.diseaseIconWrap}>
            <Ionicons name="leaf" size={22} color={colors.warning} />
          </View>
          <View>
            <Text style={styles.diseaseName}>{disease}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={[styles.severityDot, { backgroundColor: severityColor('moderate') }]} />
              <Text style={styles.severityText}>{t('moderateSeverity')} ({severity}%)</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('recommendedActions')}</Text>
        <View style={styles.card}>
          {ACTIONS.map((action, i) => (
            <View key={i} style={styles.actionRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.ok} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('organicAlternatives')}</Text>
        <View style={styles.card}>
          {ORGANICS.map((item, i) => (
            <View key={i} style={i > 0 ? { marginTop: 16 } : undefined}>
              <Text style={styles.organicName}>{item.name}</Text>
              <Text style={styles.organicDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.reminderBtn} activeOpacity={0.85}>
          <Text style={styles.reminderBtnText}>{t('scheduleReminder')}</Text>
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
  body: { padding: 20, paddingBottom: 40 },
  diseaseCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  diseaseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diseaseName: { fontWeight: '800', fontSize: 16, color: colors.textDark },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { fontWeight: '800', fontSize: 15, color: colors.textDark, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  actionText: { flex: 1, fontSize: 13, color: colors.textDark, lineHeight: 18 },
  organicName: { fontWeight: '700', color: colors.primary, fontSize: 14, marginBottom: 4 },
  organicDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  reminderBtn: { backgroundColor: colors.leafGreen, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  reminderBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});