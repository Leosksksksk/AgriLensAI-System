// src/screens/AlertsScreen.js
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const ALERT_TYPE_STYLES = {
  HIGH_RISK: { bg: colors.dangerBg, border: colors.danger, tag: colors.danger },
  WARNING: { bg: colors.warningBg, border: colors.warning, tag: colors.warning },
  INFO: { bg: colors.infoBg, border: colors.info, tag: colors.info },
  REMINDER: { bg: colors.okBg, border: colors.ok, tag: colors.ok },
};

export default function AlertsScreen() {
  const { t } = useLanguage();

  const ALERTS = [
    {
      type: 'HIGH_RISK',
      tagKey: 'highRisk',
      time: '10m ago',
      titleKey: 'alertHeatTitle',
      descKey: 'alertHeatDesc',
    },
    {
      type: 'WARNING',
      tagKey: 'tagWarning',
      time: '2h ago',
      titleKey: 'alertBlightTitle',
      descKey: 'alertBlightDesc',
    },
    {
      type: 'INFO',
      tagKey: 'tagInfo',
      time: '1d ago',
      titleKey: 'alertPendingTitle',
      descKey: 'alertPendingDesc',
    },
    {
      type: 'REMINDER',
      tagKey: 'tagReminder',
      time: '2d ago',
      titleKey: 'alertFungicideTitle',
      descKey: 'alertFungicideDesc',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('alerts')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {ALERTS.map((alert, i) => {
          const style = ALERT_TYPE_STYLES[alert.type];
          return (
            <View
              key={i}
              style={[styles.card, { backgroundColor: style.bg, borderLeftColor: style.border }]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.tag, { backgroundColor: style.tag }]}>
                  <Text style={styles.tagText}>{t(alert.tagKey)}</Text>
                </View>
                <Text style={styles.time}>{alert.time}</Text>
              </View>
              <Text style={styles.title}>{t(alert.titleKey)}</Text>
              <Text style={styles.desc}>{t(alert.descKey)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderLeftWidth: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  time: { fontSize: 11, color: colors.textLight },
  title: { fontWeight: '800', fontSize: 15, color: colors.textDark, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});