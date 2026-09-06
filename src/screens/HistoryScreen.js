// src/screens/HistoryScreen.js
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const MOCK_HISTORY = [
  { id: '1', cropKey: 'cropTomato', statusKey: 'statusHealthy', severity: 98, healthy: true, whenKey: 'whenToday' },
  { id: '2', cropKey: 'cropRice', statusKey: 'statusEarlyBlight', severity: 65, whenKey: 'whenYesterday' },
  { id: '3', cropKey: 'cropCorn', statusKey: 'statusLeafSpot', severity: 45, whenKey: 'whenTwoDaysAgo' },
  { id: '4', cropKey: 'cropEggplant', statusKey: 'statusBacterialWilt', severity: 82, whenKey: 'whenThreeDaysAgo' },
  { id: '5', cropKey: 'cropTomato', statusKey: 'statusLateBlight', severity: 71, whenKey: 'whenOneWeekAgo' },
];

function iconColorFor(item) {
  if (item.healthy) return colors.ok;
  if (item.severity >= 70) return colors.danger;
  return colors.warning;
}

export default function HistoryScreen() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_HISTORY;
    return MOCK_HISTORY.filter((h) => {
      const cropLabel = t(h.cropKey).toLowerCase();
      const statusLabel = t(h.statusKey).toLowerCase();
      return cropLabel.includes(q) || statusLabel.includes(q);
    });
  }, [query, t]);

  function renderItem({ item }) {
    const color = iconColorFor(item);
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.8}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Ionicons name="leaf" size={16} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cropName}>{t(item.cropKey)}</Text>
          <Text style={styles.statusLine}>
            {t(item.statusKey)} – {item.severity}%
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.whenText}>{t(item.whenKey)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('scanHistory')}</Text>
        <TouchableOpacity>
          <Ionicons name="filter-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchScans')}
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderTitle}>{t('recentScans')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{MOCK_HISTORY.length} {t('totalSuffix')}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        ListEmptyComponent={<Text style={styles.empty}>{t('noMatchingScans')}</Text>}
      />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textDark },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listHeaderTitle: { fontWeight: '800', fontSize: 15, color: colors.textDark },
  countBadge: { backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cropName: { fontWeight: '700', fontSize: 14, color: colors.textDark },
  statusLine: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  whenText: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});