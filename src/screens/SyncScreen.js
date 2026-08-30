// src/screens/SyncScreen.js
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const QUEUE = [
  { title: 'Scan – Tomato Leaf', time: '2 minutes ago' },
  { title: 'Scan – Rice Plant', time: '15 minutes ago' },
  { title: 'Weather Check', time: '1 hour ago' },
];

export default function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  function handleSync() {
    setSyncing(true);
    spin.setValue(0);
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })).start();
    setTimeout(() => {
      spin.stopAnimation();
      setSyncing(false);
    }, 1800);
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sync</Text>
        <TouchableOpacity style={styles.syncIcon} onPress={handleSync} disabled={syncing}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="refresh" size={20} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Offline Data</Text>
          <Text style={styles.queueSubtitle}>{QUEUE.length} records waiting to sync</Text>

          {QUEUE.map((item, i) => (
            <View key={i} style={styles.queueRow}>
              <View style={styles.clockIconWrap}>
                <Ionicons name="time-outline" size={16} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueItemTitle}>{item.title}</Text>
              </View>
              <Text style={styles.queueItemTime}>{item.time}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.syncBtn} activeOpacity={0.85} onPress={handleSync} disabled={syncing}>
          <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
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
  queueCard: {
    backgroundColor: colors.warningBg,
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: 20,
  },
  queueTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginBottom: 2 },
  queueSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
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
  queueItemTime: { fontSize: 11, color: colors.textLight },
  syncBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  syncBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
