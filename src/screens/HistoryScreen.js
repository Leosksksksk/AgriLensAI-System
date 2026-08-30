// src/screens/HistoryScreen.js
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MOCK_HISTORY = [
  { id: '1', crop: 'Tomato Leaf', status: 'Healthy', severity: 98, healthy: true, when: 'Today' },
  { id: '2', crop: 'Rice Plant', status: 'Early Blight', severity: 65, when: 'Yesterday' },
  { id: '3', crop: 'Corn Stalk', status: 'Leaf Spot', severity: 45, when: '2 days ago' },
  { id: '4', crop: 'Eggplant Leaf', status: 'Bacterial Wilt', severity: 82, when: '3 days ago' },
  { id: '5', crop: 'Tomato Leaf', status: 'Late Blight', severity: 71, when: '1 week ago' },
];

function iconColorFor(item) {
  if (item.healthy) return colors.ok;
  if (item.severity >= 70) return colors.danger;
  return colors.warning;
}

export default function HistoryScreen() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_HISTORY;
    return MOCK_HISTORY.filter(
      (h) => h.crop.toLowerCase().includes(q) || h.status.toLowerCase().includes(q)
    );
  }, [query]);

  function renderItem({ item }) {
    const color = iconColorFor(item);
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.8}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Ionicons name="leaf" size={16} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cropName}>{item.crop}</Text>
          <Text style={styles.statusLine}>
            {item.status} {item.healthy ? '' : `– ${item.severity}%`}
            {item.healthy ? ` – ${item.severity}%` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.whenText}>{item.when}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
        <TouchableOpacity>
          <Ionicons name="filter-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search scans..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderTitle}>Recent Scans</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{MOCK_HISTORY.length} total</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        ListEmptyComponent={<Text style={styles.empty}>No matching scans.</Text>}
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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