// src/screens/SyncScreen.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { syncOfflineScans } from '../services/syncService';

const QUEUE_KEY = '@offline_scan_queue';

function timeAgo(dateString) {
  if (!dateString) return 'just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SyncScreen() {
  const { t } = useLanguage();

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
      setErrorMsg('Failed to load local offline queue.');
      return [];
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    fetchPendingRecords();
  }, [fetchPendingRecords]);

  async function handleSync() {
    if (!isOnline) {
      setErrorMsg('No internet connection. Connect and try again.');
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
      // Execute the sync service to upload queued offline scans to Supabase
      await syncOfflineScans();
      // Refresh the local queue list view
      await fetchPendingRecords();
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      setErrorMsg(e.message ?? 'Sync failed.');
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('sync')}</Text>
        <TouchableOpacity style={styles.syncIcon} onPress={handleSync} disabled={syncing}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="refresh" size={20} color={colors.white} />
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
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
            <Text style={styles.offlineBannerText}>{t('noInternet')}</Text>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>{t('offlineData')}</Text>
          <Text style={styles.queueSubtitle}>
            {pendingRecords.length} {t('recordsWaiting')}
          </Text>

          {pendingRecords.length === 0 ? (
            <Text style={styles.emptyText}>
              {syncing || refreshing ? '...' : 'All caught up — nothing pending in queue.'}
            </Text>
          ) : (
            pendingRecords.map((item, index) => (
              <View key={item.id || index} style={styles.queueRow}>
                <View style={styles.clockIconWrap}>
                  <Ionicons name="time-outline" size={16} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueItemTitle}>Scan #{item.id.slice(-4)}</Text>
                  <Text style={styles.queueItemStatus}>Pending Offline Upload</Text>
                </View>
                <Text style={styles.queueItemTime}>{timeAgo(item.timestamp)}</Text>
              </View>
            ))
          )}
        </View>

        {lastSyncedAt && (
          <Text style={styles.lastSyncedText}>
            Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.syncBtn, (!isOnline || syncing) && styles.syncBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSync}
          disabled={syncing || !isOnline}
        >
          <Text style={styles.syncBtnText}>{syncing ? t('syncing') : t('syncNow')}</Text>
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
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
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
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  offlineBannerText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { color: colors.danger, fontSize: 12 },
  queueCard: {
    backgroundColor: colors.warningBg,
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: 16,
  },
  queueTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginBottom: 2 },
  queueSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  emptyText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
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
  queueItemTitle: { fontWeight: '700', color: colors.textDark, fontSize: 13 },
  queueItemStatus: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  queueItemTime: { fontSize: 11, color: colors.textLight },
  lastSyncedText: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginBottom: 14 },
  syncBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});