// src/screens/HistoryScreen.js
import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';
import { useAppAlert } from '../context/AppAlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { deletePendingScan, getPendingScans } from '../services/syncService';
import { glassPopupTheme } from '../theme/colors';

function getConditionKey(scan) {
  const diseaseId = String(scan.disease_id || '').toLowerCase();
  const status = String(scan.status || '').toLowerCase();
  if (diseaseId === 'healthy' || status === 'healthy') return 'conditionNormal';

  const severity = String(scan.severity || '').toLowerCase();
  if (['mild', 'moderate', 'severe'].includes(severity)) {
    return `severity${severity[0].toUpperCase()}${severity.slice(1)}`;
  }

  const hasDamage = scan.damage_percent !== null && scan.damage_percent !== undefined && scan.damage_percent !== '';
  const damage = Number(scan.damage_percent);
  if (hasDamage && Number.isFinite(damage)) {
    if (damage <= 0) return 'conditionNormal';
    if (damage < 15) return 'severityMild';
    if (damage < 40) return 'severityModerate';
    return 'severitySevere';
  }

  if (status.includes('pending')) return 'conditionPending';
  return status === 'analysis complete' ? 'conditionNormal' : 'conditionPending';
}

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

function iconColorFor(severity, disease, colors) {
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
  const { colors, isDark } = useTheme();
  const Alert = useAppAlert();
  const [query, setQuery] = useState('');
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedScan, setSelectedScan] = useState(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'disease', 'severity'
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    let offlineScans = [];
    try {
      const pendingScans = await getPendingScans();
      offlineScans = pendingScans.map((scan) => ({
        id: `offline-${scan.id}`,
        localQueueId: scan.id,
        isOfflineQueued: true,
        image_url: scan.imageUri,
        crop_name: scan.diagnosisResult?.cropName || 'Crop',
        disease_id: scan.diagnosisResult?.diseaseId || null,
        damage_percent: scan.diagnosisResult?.damagePercent ?? null,
        severity: scan.diagnosisResult?.severity || null,
        status: 'Offline',
        created_at: scan.timestamp,
      }));
    } catch (error) {
      console.warn('Could not load offline scan history:', error);
    }

    try {
      const now = new Date().toISOString();
      await supabase.from('scan_results').delete().lt('expires_at', now);

      const { data, error } = await supabase
        .from('scan_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans([...(data || []), ...offlineScans]);
    } catch (error) {
      console.error('Fetch error:', error);
      setScans(offlineScans);
      if (offlineScans.length === 0) {
        Alert.alert(t('loadErrorTitle'), t('loadErrorDesc'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [Alert, t]);

  useFocusEffect(useCallback(() => {
    fetchHistory();
  }, [fetchHistory]));

  const confirmDelete = (id) => {
    Alert.alert(t('deleteScanTitle'), t('deleteScanDesc'), [
      { text: t('cancelText'), style: "cancel" },
      { text: t('deleteText'), style: "destructive", onPress: () => executeDelete(id) }
    ]);
  };

  const executeDelete = async (id) => {
    try {
      const scanToDelete = scans.find((s) => s.id === id);
      if (scanToDelete?.isOfflineQueued) {
        await deletePendingScan(scanToDelete.localQueueId);
        setScans((prev) => prev.filter((s) => s.id !== id));
        setSelectedScan(null);
        return;
      }
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
      const offlineScans = scansToDelete.filter((scan) => scan.isOfflineQueued);
      const remoteScans = scansToDelete.filter((scan) => !scan.isOfflineQueued);
      await Promise.all(offlineScans.map((scan) => deletePendingScan(scan.localQueueId)));
      const fileNames = remoteScans
        .map((s) => getFileNameFromUrl(s.image_url))
        .filter(Boolean);

      if (fileNames.length > 0) {
        await supabase.storage.from('scans').remove(fileNames);
      }

      if (remoteScans.length > 0) {
        const { error } = await supabase
          .from('scan_results')
          .delete()
          .in('id', remoteScans.map((scan) => scan.id));
        if (error) throw error;
      }

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
    let result = scans;
    
    // Filter by query
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((h) => {
        const diseaseLabel = (h.disease_id || h.status || '').toLowerCase();
        const cropLabel = (h.crop_name || t('historyCropNumber').replace('{number}', '')).toLowerCase();
        const conditionLabel = t(getConditionKey(h)).toLowerCase();
        return diseaseLabel.includes(q) || cropLabel.includes(q) || conditionLabel.includes(q);
      });
    }
    
    // Sort
    switch (sortBy) {
      case 'newest':
        result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'disease':
        result = [...result].sort((a, b) => {
          const aDisease = a.disease_id || a.status || '';
          const bDisease = b.disease_id || b.status || '';
          return aDisease.localeCompare(bDisease);
        });
        break;
      case 'severity':
        result = [...result].sort((a, b) => (b.damage_percent || 0) - (a.damage_percent || 0));
        break;
    }
    
    return result;
  }, [query, scans, sortBy, t]);

function renderItem({ item, index }) {
    const percent = item.damage_percent || 0; 
    const conditionKey = getConditionKey(item);
    const conditionLabel = t(conditionKey);
    const cropLabel = t('historyCropNumber').replace('{number}', String(index + 1));
    const color = iconColorFor(percent, item.disease_id || item.status, colors);
    
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.row, isSelected && styles.selectedRow, { backgroundColor: isSelected ? colors.border : colors.card, borderColor: colors.primaryDark }]} 
        activeOpacity={0.8}
        onLongPress={() => handleLongPressItem(item.id)}
        onPress={() => handlePressItem(item)}
      >
        {isSelectMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={24} 
              color={isSelected ? colors.primaryDark : colors.textLight} 
            />
          </View>
        )}

        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Ionicons name="leaf" size={18} color={colors.white} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLine, { color: colors.textMuted }]}>
            {t('cropConditionLabel').replace('{crop}', cropLabel).replace('{condition}', conditionLabel)}
          </Text>
          {item.damage_percent > 0 && (
            <Text style={[styles.damageText, { color: colors.textLight }]}>
              {percent}% {t('severityLabel').toLowerCase()}
            </Text>
          )}
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.whenText, { color: colors.textLight }]}>{formatTime(item.created_at, t)}</Text>
          {!isSelectMode && <Ionicons name="chevron-forward" size={16} color={colors.textLight} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isSelectMode ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedIds([]); }}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{selectedIds.length} Selected</Text>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Ionicons 
              name={selectedIds.length === filtered.length ? "checkbox" : "square-outline"} 
              size={24} 
              color={selectedIds.length === filtered.length ? colors.primaryDark : colors.textLight} 
            />
            <Text style={[styles.selectAllText, { color: colors.white }]}>
              {selectedIds.length === filtered.length ? t('deselectAll') : t('selectAll')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmBatchDelete}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('scanHistory')}</Text>
          <TouchableOpacity onPress={() => setSortModalVisible(true)}>
            <Ionicons name="filter-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={styles.sortModalOverlay} onPress={() => setSortModalVisible(false)}>
          <Pressable style={styles.sortModalSheet} onPress={() => {}}>
            <Text style={[styles.sortModalTitle, { color: glassPopupTheme.text }]}>{t('sortBy') || 'Sort By'}</Text>
            {[
              { key: 'newest', label: t('sortNewest') || 'Newest First' },
              { key: 'oldest', label: t('sortOldest') || 'Oldest First' },
              { key: 'disease', label: t('sortDisease') || 'Disease Name' },
              { key: 'severity', label: t('sortSeverity') || 'Severity (High to Low)' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortModalOption, { borderBottomColor: glassPopupTheme.border }, sortBy === option.key && styles.sortModalOptionActive]}
                onPress={() => { setSortBy(option.key); setSortModalVisible(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sortModalOptionText, sortBy === option.key && styles.sortModalOptionTextActive, { color: sortBy === option.key ? glassPopupTheme.accent : glassPopupTheme.text }]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Ionicons name="checkmark" size={22} color={glassPopupTheme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textDark }]}
          placeholder={t('searchScans')}
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderTitle, { color: colors.textDark }]}>{t('recentScans')}</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
          <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{filtered.length} {t('totalSuffix')}</Text>
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
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>{t('noMatchingScans')}</Text>}
        />
      )}

      <Modal
        visible={!!selectedScan}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedScan(null)}
      >
        <View style={[styles.modalBackground, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedScan(null)}
          >
            <Ionicons name="close" size={34} color={colors.white} />
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
              <Ionicons name="trash-outline" size={22} color={colors.white} />
              <Text style={[styles.actionText, { color: colors.white }]}>Delete Now</Text>
            </TouchableOpacity>

            {!selectedScan?.isOfflineQueued && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                onPress={() => handleSetAutoDelete(selectedScan.id)}
              >
                <Ionicons name="timer-outline" size={22} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Auto-Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: 'transparent', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  selectAllText: { fontSize: 12, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listHeaderTitle: { fontWeight: '800', fontSize: 17 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  selectedRow: {
    borderWidth: 1,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cropName: { fontWeight: '700', fontSize: 16 },
  statusLine: { fontSize: 14, marginTop: 2 },
  damageText: { fontSize: 12, marginTop: 2 },
  whenText: { fontSize: 13, marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 40 },
  
  modalBackground: {
    flex: 1,
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
    fontWeight: '700',
    fontSize: 16,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    backgroundColor: glassPopupTheme.surface,
    borderWidth: 1,
    borderColor: glassPopupTheme.border,
    borderRadius: 16,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 12,
  },
  sortModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  sortModalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sortModalOptionActive: {},
  sortModalOptionText: { fontSize: 17 },
  sortModalOptionTextActive: { fontWeight: '700' },
});