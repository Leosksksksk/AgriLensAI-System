// src/screens/TreatmentPlanScreen.js
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getDiseaseProfile } from '../utils/diseaseCatalog';
import { addReminder, hasActiveReminder } from '../utils/reminderStorage';

const REMINDER_DAYS_AHEAD = 3;

export default function TreatmentPlanScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { colors, severityColor } = useTheme();

  const diseaseId = route?.params?.diseaseId ?? 'leafBlight';
  const damagePercent = route?.params?.damagePercent ?? 0;

  const profile = getDiseaseProfile(diseaseId);
  const diseaseName = t(profile.nameKey);
  const actions = profile.mitigationKeys.map((key) => t(key));

  const [scheduling, setScheduling] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  useEffect(() => {
    hasActiveReminder(diseaseId, 'Crop').then(setReminderSet);
  }, [diseaseId]);

  const ORGANICS = [
    { name: t('organicBakingSodaName'), desc: t('organicBakingSodaDesc') },
    { name: t('organicNeemName'), desc: t('organicNeemDesc') },
  ];

  async function handleScheduleReminder() {
    if (reminderSet) {
      Alert.alert(t('reminderAlreadySet'), t('reminderAlreadySetDesc'));
      return;
    }

    setScheduling(true);
    try {
      const reminder = await addReminder({
        diseaseId,
        diseaseName,
        cropLabel: 'Crop',
        daysAhead: REMINDER_DAYS_AHEAD,
      });
      setReminderSet(true);

      const dueDate = new Date(reminder.dueDateISO);
      Alert.alert(
        t('reminderScheduledTitle'),
        `${t('reminderScheduledDesc')}\n\n${dueDate.toLocaleDateString()}`
      );
    } catch (e) {
      console.warn('Reminder scheduling error:', e);
      Alert.alert(t('reminderErrorTitle'), e.message ?? t('reminderErrorDesc'));
    } finally {
      setScheduling(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.white }]}>{t('treatmentPlan')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.diseaseCard, { backgroundColor: colors.card }]}>
          <View style={[styles.diseaseIconWrap, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="leaf" size={24} color={colors.warning} />
          </View>
          <View>
            <Text style={[styles.diseaseName, { color: colors.textDark }]}>{diseaseName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={[styles.severityDot, { backgroundColor: severityColor('moderate') }]} />
              <Text style={[styles.severityText, { color: colors.textMuted }]}>{damagePercent.toFixed(1)}% {t('leafTissueDamage')}</Text>
            </View>
          </View>
        </View>

        {diseaseId === 'healthy' ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {actions.map((action, i) => (
              <View key={i} style={styles.actionRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.ok} />
                <Text style={[styles.actionText, { color: colors.textDark }]}>{action}</Text>
              </View>
            ))}
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('recommendedActions')}</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {actions.map((action, i) => (
                <View key={i} style={styles.actionRow}>
<Ionicons name="checkmark-circle" size={20} color={colors.ok} />
                  <Text style={[styles.actionText, { color: colors.textDark }]}>{action}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('organicAlternatives')}</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {ORGANICS.map((item, i) => (
                <View key={i} style={i > 0 ? { marginTop: 16 } : undefined}>
                  <Text style={[styles.organicName, { color: colors.primary }]}>{item.name}</Text>
                  <Text style={[styles.organicDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.reminderBtn, reminderSet && styles.reminderBtnDone, { backgroundColor: reminderSet ? colors.textMuted : colors.leafGreen }]}
              activeOpacity={0.85}
              onPress={handleScheduleReminder}
              disabled={scheduling}
            >
              <Text style={[styles.reminderBtnText, { color: colors.white }]}>
                {scheduling
                  ? t('schedulingReminder')
                  : reminderSet
                  ? `✓ ${t('reminderAlreadySet')}`
                  : t('scheduleReminder')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 40 },
  diseaseCard: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  diseaseName: { fontWeight: '800', fontSize: 18 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: 14 },
  sectionTitle: { fontWeight: '800', fontSize: 17, marginBottom: 10 },
  card: { borderRadius: 14, padding: 16, marginBottom: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  actionText: { flex: 1, fontSize: 15, lineHeight: 20 },
  organicName: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  organicDesc: { fontSize: 15, lineHeight: 20 },
  reminderBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  reminderBtnDone: {},
  reminderBtnText: { fontWeight: '800', fontSize: 17 },
});