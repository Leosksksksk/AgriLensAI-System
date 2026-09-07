// src/screens/AlertsScreen.js
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { buildAlertsFeed } from '../services/alertsService';

const ALERT_TYPE_STYLES = {
  HIGH_RISK: { bg: colors.dangerBg, border: colors.danger, tag: colors.danger },
  WARNING: { bg: colors.warningBg, border: colors.warning, tag: colors.warning },
  INFO: { bg: colors.infoBg, border: colors.info, tag: colors.info },
  REMINDER: { bg: colors.okBg, border: colors.ok, tag: colors.ok },
};

function interpolate(template, values, t) {
  let result = template;
  Object.entries(values || {}).forEach(([key, value]) => {
    const isKeyRef = key.endsWith('NameKey');
    const resolved = isKeyRef ? t(value) : value;
    const placeholder = isKeyRef ? key.replace('NameKey', '') : key;
    result = result.split(`{${placeholder}}`).join(resolved);
  });
  return result;
}

export default function AlertsScreen() {
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    const feed = await buildAlertsFeed();
    setAlerts(feed);
  }, []);

  useEffect(() => {
    loadAlerts().finally(() => setLoading(false));
  }, [loadAlerts]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('alerts')}</Text>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('noAlertsTitle')}</Text>
              <Text style={styles.emptyDesc}>{t('noAlertsDesc')}</Text>
            </View>
          ) : (
            alerts.map((alert) => {
              const style = ALERT_TYPE_STYLES[alert.type];
              const descTemplate = t(alert.descKey);
              const desc = interpolate(descTemplate, alert.descValues, t);
              return (
                <View
                  key={alert.id}
                  style={[styles.card, { backgroundColor: style.bg, borderLeftColor: style.border }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.tag, { backgroundColor: style.tag }]}>
                      <Text style={styles.tagText}>{t(alert.tagKey)}</Text>
                    </View>
                    <Text style={styles.time}>{alert.time}</Text>
                  </View>
                  <Text style={styles.title}>{t(alert.titleKey)}</Text>
                  <Text style={styles.desc}>{desc}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.white },
  emptyDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 30 },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderLeftWidth: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  time: { fontSize: 11, color: colors.textMuted },
  title: { fontWeight: '800', fontSize: 15, color: colors.textDark, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});