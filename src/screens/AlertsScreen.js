// src/screens/AlertsScreen.js
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const ALERT_TYPES = {
  'HIGH RISK': { bg: colors.dangerBg, border: colors.danger, tag: colors.danger },
  WARNING: { bg: colors.warningBg, border: colors.warning, tag: colors.warning },
  INFO: { bg: colors.infoBg, border: colors.info, tag: colors.info },
  REMINDER: { bg: colors.okBg, border: colors.ok, tag: colors.ok },
};

const ALERTS = [
  {
    type: 'HIGH RISK',
    time: '10m ago',
    title: 'Extreme Heat Warning',
    desc: 'Temperatures exceeding 35°C increase early blight risk. Water early in the morning.',
  },
  {
    type: 'WARNING',
    time: '2h ago',
    title: 'Early Blight Nearby',
    desc: '5 farms in your barangay reported early blight on tomatoes. Protect your crops.',
  },
  {
    type: 'INFO',
    time: '1d ago',
    title: 'Pending Offline Scans',
    desc: 'You have 3 records waiting to sync. Connect to internet to sync now.',
  },
  {
    type: 'REMINDER',
    time: '2d ago',
    title: 'Apply Fungicide Today',
    desc: 'Scheduled treatment for your tomato crops in Barangay Bogo.',
  },
];

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {ALERTS.map((alert, i) => {
          const style = ALERT_TYPES[alert.type];
          return (
            <View
              key={i}
              style={[styles.card, { backgroundColor: style.bg, borderLeftColor: style.border }]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.tag, { backgroundColor: style.tag }]}>
                  <Text style={styles.tagText}>{alert.type}</Text>
                </View>
                <Text style={styles.time}>{alert.time}</Text>
              </View>
              <Text style={styles.title}>{alert.title}</Text>
              <Text style={styles.desc}>{alert.desc}</Text>
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