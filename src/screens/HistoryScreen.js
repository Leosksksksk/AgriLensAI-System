// src/screens/HistoryScreen.js
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';

function formatTime(dateString, t) {
  if (!dateString) return '';
  const diffDays = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return t('whenToday');
  if (diffDays === 1) return t('whenYesterday');
  if (diffDays === 2) return t('whenTwoDaysAgo');
  if (diffDays === 3) return t('whenThreeDaysAgo');
  if (diffDays >= 7 && diffDays < 14) return t('whenOneWeekAgo');
  return new Date(dateString).toLocaleDateString();
}

function iconColorFor(severity, disease) {
  if (disease?.toLowerCase().includes('healthy')) return colors.ok;
  if (severity >= 70) return colors.danger;
  return colors.warning;
}

const getFileNameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1]?.split('?')[0];
};

export default function HistoryScreen() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedScan, setSelectedScan] = useState(null);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setIsLoading(true);
      
      const now = new Date().toISOString();
      await supabase.from('scan_results').delete().lt('expires_at', now);

      const { data, error } = await supabase
        .from('scan_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert(t('loadErrorTitle'), t('loadErrorDesc'));
    } finally {
      setIsLoading(false);
    }
  }

  const confirmDelete = (id) => {
    Alert.alert(t('deleteScanTitle'), t('deleteScanDesc'), [
      { text: t('cancelText'), style: "cancel" },
      { text: t('deleteText'), style: "destructive", onPress: () => executeDelete(id) }
    ]);
  };

  const executeDelete = async (id) => {
    try {
      const scanToDelete = scans.find((s) => s.id === id);
      if (scanToDelete && scanToDelete.image_url) {
        const fileName = getFileNameFromUrl(scanToDelete.image_url);
        if (fileName) {
          await supabase.storage.from('scans').remove([fileName]);
        }
      }

      const { error } = await supabase.from('scan_results').delete().eq('id', id);
      if (error) throw error;
      
      setScans((prev) => prev.filter((s) => s.id !== id));
      setSelectedScan(null);
    } catch (err) {
      console.error(err);
      Alert.alert(t('deleteErrorTitle'), t('deleteErrorDesc'));
    }
  };

  const confirmBatchDelete = () => {
    Alert.alert(
      t('batchDeleteTitle'),
      t('batchDeleteDesc').replace('{count}', selectedIds.length),
      [
        { text: t('cancelText'), style: "cancel" },
        { text: t('deleteAllText'), style: "destructive", onPress: executeBatchDelete }
      ]
    );
  };

  const executeBatchDelete = async () => {
    try {
      const scansToDelete = scans.filter((s) => selectedIds.includes(s.id));
      const fileNames = scansToDelete
        .map((s) => getFileNameFromUrl(s.image_url))
        .filter(Boolean);

      if (fileNames.length > 0) {
        await supabase.storage.from('scans').remove(fileNames);
      }

      const { error } = await supabase
        .from('scan_results')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setScans((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      console.error(err);
      Alert.alert(t('batchDeleteErrorTitle'), t('batchDeleteErrorDesc'));
    }
  };

  const handleSetAutoDelete = (id) => {
    Alert.alert(t('autoDeleteTitle'), t('autoDeleteDesc'), [
      { text: "In 24 Hours", onPress: () => applyAutoDelete(id, 24) },
      { text: "In 7 Days", onPress: () => applyAutoDelete(id, 24 * 7) },
      { text: "In 30 Days", onPress: () => applyAutoDelete(id, 24 * 30) },
      { text: t('cancelText'), style: "cancel" }
    ]);
  };

  const applyAutoDelete = async (id, hours) => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    try {
      const { error } = await supabase
        .from('scan_results')
        .update({ expires_at: expiresAt.toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      
      const timeText = hours >= 24 ? hours/24 + ' days' : hours + ' hours';
      Alert.alert(t('timerSetTitle'), t('timerSetDesc').replace('{time}', timeText));
    } catch (err) {
      console.error(err);
      Alert.alert(t('autoDeleteErrorTitle'), t('autoDeleteErrorDesc'));
    }
  };

  const handleLongPressItem = (id) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedIds([id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((item) => item.id));
    }
  };

  const handlePressItem = (item) => {
    if (isSelectMode) {
      if (selectedIds.includes(item.id)) {
        const updated = selectedIds.filter((i) => i !== item.id);
        setSelectedIds(updated);
        if (updated.length === 0) {
          setIsSelectMode(false);
        }
      } else {
        setSelectedIds([...selectedIds, item.id]);
      }
    } else {
      if (item.image_url) {
        setSelectedScan(item);
      } else {
        Alert.alert(t('noImageTitle'), t('noImageDesc'));
      }
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scans;
    return scans.filter((h) => {
      const diseaseLabel = (h.disease_id || h.status || '').toLowerCase();
      const cropLabel = (h.crop_name || '').toLowerCase(); 
      return diseaseLabel.includes(q) || cropLabel.includes(q);
    });
  }, [query, scans]);

  function renderItem({ item }) {
    const percent = item.damage_percent || 0; 
    const diseaseText = item.disease_id || item.status || 'Pending Analysis';
    const cropText = item.crop_name || ''; 
    const color = iconColorFor(percent, diseaseText);
    
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.row, isSelected && styles.selectedRow]} 
        activeOpacity={0.8}
        onLongPress={() => handleLongPressItem(item.id)}
        onPress={() => handlePressItem(item)}
      >
        {isSelectMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={22} 
              color={isSelected ? colors.primaryDark : colors.textLight} 
            />
          </View>
        )}

        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Ionicons name="leaf" size={16} color={colors.white} />
        </View>
        
        <View style={{ flex: 1 }}>
          {cropText && <Text style={styles.cropName}>{cropText}</Text>}
          <Text style={styles.statusLine}>
            {diseaseText} {item.damage_percent ? `– ${percent}%` : ''}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.whenText}>{formatTime(item.created_at, t)}</Text>
          {!isSelectMode && <Ionicons name="chevron-forward" size={16} color={colors.textLight} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isSelectMode ? (
        <View style={[styles.header, { backgroundColor: colors.textDark }]}>
          <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedIds([]); }}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedIds.length} Selected</Text>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Ionicons 
              name={selectedIds.length === filtered.length ? "checkbox" : "square-outline"} 
              size={22} 
              color={selectedIds.length === filtered.length ? colors.primaryDark : colors.textLight} 
            />
            <Text style={styles.selectAllText}>
              {selectedIds.length === filtered.length ? t('deselectAll') : t('selectAll')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmBatchDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('scanHistory')}</Text>
          <TouchableOpacity>
            <Ionicons name="filter-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

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
          <Text style={styles.countBadgeText}>{filtered.length} {t('totalSuffix')}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primaryDark} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={styles.empty}>{t('noMatchingScans')}</Text>}
        />
      )}

      <Modal
        visible={!!selectedScan}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedScan(null)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedScan(null)}
          >
            <Ionicons name="close" size={32} color={colors.white} />
          </TouchableOpacity>
          
          {selectedScan?.image_url && (
            <Image
              source={{ uri: selectedScan.image_url }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() => confirmDelete(selectedScan.id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.white} />
              <Text style={styles.actionText}>Delete Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={() => handleSetAutoDelete(selectedScan.id)}
            >
              <Ionicons name="timer-outline" size={20} color={colors.white} />
              <Text style={styles.actionText}>Auto-Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  selectAllText: { color: colors.white, fontSize: 10, marginTop: 2 },
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
  selectedRow: {
    backgroundColor: colors.border,
    borderColor: colors.primaryDark,
    borderWidth: 1,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cropName: { fontWeight: '700', fontSize: 14, color: colors.textDark },
  statusLine: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  whenText: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 2,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '75%',
  },
  actionContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 50,
    gap: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  actionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});