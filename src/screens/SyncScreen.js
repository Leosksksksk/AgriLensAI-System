// src/screens/SyncScreen.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { syncOfflineScans } from '../services/syncService';

const QUEUE_KEY = '@offline_scan_queue';

function timeAgo(dateString, t) {
  if (!dateString) return t('timeJustNow');
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('timeJustNow');
  if (mins < 60) return t('timeMinutesAgo').replace('{mins}', mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('timeHoursAgo').replace('{hrs}', hrs);
  const days = Math.floor(hrs / 24);
  return t('timeDaysAgo').replace('{days}', days);
}

export default function SyncScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOnline(!!state.isConnected));
    return unsub;
  }, []);

  const fetchPendingRecords = useCallback(async () => {
    setErrorMsg(null);
    try {
      const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      setPendingRecords(queue);
      return queue;
    } catch (e) {
      console.error('Failed to load local queue:', e);
      setErrorMsg(t('syncLoadError'));
      return [];
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    fetchPendingRecords();
  }, [fetchPendingRecords]);

   async function handleSync() {
    if (!isOnline) {
      setErrorMsg(t('syncNoInternet'));
      return;
    }

    setSyncing(true);
    setErrorMsg(null);
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    loop.start();

    try {
      const summary = await syncOfflineScans();
      await fetchPendingRecords();
      setLastSyncedAt(new Date().toISOString());

      if (summary.failed > 0) {
        const firstReason = summary.errors[0]?.reason ?? 'Unknown error';
        setErrorMsg(
          t('syncPartialSuccess')
            .replace('{synced}', summary.synced)
            .replace('{failed}', summary.failed)
            .replace('{reason}', firstReason)
        );
      }
    } catch (e) {
      setErrorMsg(e.message ?? t('syncFailed'));
    } finally {
      loop.stop();
      setSyncing(false);
    }
  }

  async function handlePullToRefresh() {
    setRefreshing(true);
    await fetchPendingRecords();
    setRefreshing(false);
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>{t('sync')}</Text>
        <TouchableOpacity style={styles.syncIcon} onPress={handleSync} disabled={syncing}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="refresh" size={22} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} />
        }
      >
        {!isOnline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.dangerBg }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
            <Text style={[styles.offlineBannerText, { color: colors.danger }]}>{t('noInternet')}</Text>
          </View>
        )}

        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.errorBannerText, { color: colors.danger }]}>{errorMsg}</Text>
          </View>
        )}

        <View style={[styles.queueCard, { backgroundColor: colors.warningBg, borderLeftColor: colors.warning }]}>
          <Text style={[styles.queueTitle, { color: colors.textDark }]}>{t('offlineData')}</Text>
          <Text style={[styles.queueSubtitle, { color: colors.textMuted }]}>
            {pendingRecords.length} {t('recordsWaiting')}
          </Text>

          {pendingRecords.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {syncing || refreshing ? '...' : t('syncAllCaughtUp')}
            </Text>
          ) : (
            pendingRecords.map((item, index) => (
              <View key={item.id || index} style={styles.queueRow}>
                <View style={styles.clockIconWrap}>
                  <Ionicons name="time-outline" size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.queueItemTitle, { color: colors.textDark }]}>Scan #{item.id.slice(-4)}</Text>
                  <Text style={[styles.queueItemStatus, { color: colors.textMuted }]}>{t('syncPendingStatus')}</Text>
                </View>
                <Text style={[styles.queueItemTime, { color: colors.textLight }]}>{timeAgo(item.timestamp, t)}</Text>
              </View>
            ))
          )}
        </View>

        {lastSyncedAt && (
          <Text style={[styles.lastSyncedText, { color: colors.textLight }]}>
            Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.syncBtn, (!isOnline || syncing) && styles.syncBtnDisabled, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={handleSync}
          disabled={syncing || !isOnline}
        >
          <Text style={[styles.syncBtnText, { color: colors.white }]}>{syncing ? t('syncing') : t('syncNow')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  syncIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingBottom: 40 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  offlineBannerText: { fontSize: 14, fontWeight: '700' },
  errorBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { fontSize: 14 },
  queueCard: {
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  queueTitle: { fontWeight: '800', fontSize: 18, marginBottom: 2 },
  queueSubtitle: { fontSize: 15, marginBottom: 16 },
  emptyText: { fontSize: 15, fontStyle: 'italic' },
  queueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clockIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FCEACB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  queueItemTitle: { fontWeight: '700', fontSize: 15 },
  queueItemStatus: { fontSize: 13, marginTop: 1 },
  queueItemTime: { fontSize: 13 },
  lastSyncedText: { fontSize: 13, textAlign: 'center', marginBottom: 14 },
  syncBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { fontWeight: '800', fontSize: 17 },
});