// src/screens/ProfileScreen.js
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';
import { useAppAlert } from '../context/AppAlertContext';

const ALL_CROPS = [
  { id: 'corn', labelKey: 'cropCorn' },
  { id: 'pepper', labelKey: 'cropPepper' },
  { id: 'tomato', labelKey: 'cropTomato' },
  { id: 'potato', labelKey: 'cropPotato' },
];

export default function ProfileScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const Alert = useAppAlert();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [selectedCropIds, setSelectedCropIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Store original values for cancel functionality
  const [originalValues, setOriginalValues] = useState({
    fullName: '',
    phone: '',
    barangay: '',
    farmSize: '',
    selectedCropIds: [],
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      // 1. Load local storage values first (from Login / Onboarding)
      const localName = await AsyncStorage.getItem('user_full_name');
      const localPhone = await AsyncStorage.getItem('user_phone');
      const localBarangay = await AsyncStorage.getItem('user_barangay');
      const localFarmSize = await AsyncStorage.getItem('user_farm_size');
      const localCrops = await AsyncStorage.getItem('user_crop_types');

      if (localName) setFullName(localName);
      if (localPhone) setPhone(localPhone);
      if (localBarangay) setBarangay(localBarangay);
      if (localFarmSize) setFarmSize(localFarmSize);
      if (localCrops) {
        try { setSelectedCropIds(JSON.parse(localCrops)); } catch (err) {}
      }

      // 2. Fetch from Supabase, but let local storage take precedence if it exists
      const { user } = await getValidUserSession(false);
      if (user) {
        const { data, error } = await supabase
          .from('farmers')
          .select('full_name, phone, barangay, farm_size, crop_types')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          // Prioritize local storage (what the user just typed), fallback to DB
          setFullName(localName || data.full_name || '');
          setPhone(localPhone || data.phone || '');
          setBarangay(localBarangay || data.barangay || '');
          setFarmSize(localFarmSize || data.farm_size || '');
          setSelectedCropIds(
            localCrops ? JSON.parse(localCrops) : (data.crop_types?.length ? data.crop_types : [])
          );
        }
      }

      // Save original values for cancel
      setOriginalValues({
        fullName: fullName || localName || (user ? data?.full_name : '') || '',
        phone: phone || localPhone || (user ? data?.phone : '') || '',
        barangay: barangay || localBarangay || (user ? data?.barangay : '') || '',
        farmSize: farmSize || localFarmSize || (user ? data?.farm_size : '') || '',
        selectedCropIds: selectedCropIds.length ? selectedCropIds : (localCrops ? JSON.parse(localCrops) : (user && data?.crop_types?.length ? data.crop_types : [])),
      });
    } catch (e) {
      console.warn('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleEditPress() {
    // Save current values as original before editing
    setOriginalValues({
      fullName,
      phone,
      barangay,
      farmSize,
      selectedCropIds: [...selectedCropIds],
    });
    setEditing(true);
  }

  function handleCancelPress() {
    // Restore original values
    setFullName(originalValues.fullName);
    setPhone(originalValues.phone);
    setBarangay(originalValues.barangay);
    setFarmSize(originalValues.farmSize);
    setSelectedCropIds([...originalValues.selectedCropIds]);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Save locally
      await AsyncStorage.setItem('user_full_name', fullName);
      await AsyncStorage.setItem('user_phone', phone);
      await AsyncStorage.setItem('user_barangay', barangay);
      await AsyncStorage.setItem('user_farm_size', farmSize);
      await AsyncStorage.setItem('user_crop_types', JSON.stringify(selectedCropIds));

      // Upsert to Supabase so the database is updated with the user's new inputs
      const { user } = await getValidUserSession();
      if (user) {
        const { error } = await supabase.from('farmers').upsert(
          {
            id: user.id,
            full_name: fullName,
            phone,
            barangay,
            farm_size: farmSize,
            crop_types: selectedCropIds,
          },
          { onConflict: 'id' }
        );

        if (error) throw error;
      }

      Alert.alert(t('profileSavedTitle'), t('profileSavedDesc'));
      setEditing(false);
    } catch (e) {
      console.warn('Profile save error:', e);
      Alert.alert(t('profileErrorTitle'), e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCrop(cropId) {
    if (!editing) return;
    setSelectedCropIds((prev) =>
      prev.includes(cropId) ? prev.filter((c) => c !== cropId) : [...prev, cropId]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerFill, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
          {editing ? (
            <View style={styles.headerEditActions}>
              <TouchableOpacity onPress={handleCancelPress} activeOpacity={0.7}>
                <Text style={[styles.headerActionText, { color: colors.white }]}>{t('cancelText')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtnSmall, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[styles.saveBtnTextSmall, { color: colors.white }]}>{t('saveProfile')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={handleEditPress} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={26} color={colors.white} />
            </TouchableOpacity>
          )}
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.white} />
          </View>
          <Text style={[styles.name, { color: colors.white }]}>{fullName || t('fullName')}</Text>
          <Text style={[styles.subLabel, { color: '#DCEEDC' }]}>{t('farmLabel')} · {barangay || '—'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textDark }]}>{t('personalInfo')}</Text>

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('fullName')}</Text>
          <TextInput
            style={[styles.input, editing ? styles.inputActive : styles.inputReadOnly, { backgroundColor: editing ? colors.background : colors.border, color: colors.textDark }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('fullName')}
            placeholderTextColor={colors.textLight}
            editable={editing}
          />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('phoneNumber')}</Text>
          <TextInput
            style={[styles.input, editing ? styles.inputActive : styles.inputReadOnly, { backgroundColor: editing ? colors.background : colors.border, color: colors.textDark }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+63 9XX XXX XXXX"
            placeholderTextColor={colors.textLight}
            editable={editing}
          />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('barangay')}</Text>
          <TextInput
            style={[styles.input, editing ? styles.inputActive : styles.inputReadOnly, { backgroundColor: editing ? colors.background : colors.border, color: colors.textDark }]}
            value={barangay}
            onChangeText={setBarangay}
            placeholder={t('barangay')}
            placeholderTextColor={colors.textLight}
            editable={editing}
          />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('farmSize')}</Text>
          <TextInput
            style={[styles.input, editing ? styles.inputActive : styles.inputReadOnly, { backgroundColor: editing ? colors.background : colors.border, color: colors.textDark }]}
            value={farmSize}
            onChangeText={setFarmSize}
            placeholder={t('farmSize')}
            placeholderTextColor={colors.textLight}
            editable={editing}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('cropTypes')}</Text>
        <View style={styles.chipRow}>
          {ALL_CROPS.map((crop) => {
            const active = selectedCropIds.includes(crop.id);
            return (
              <TouchableOpacity
                key={crop.id}
                style={[styles.chip, active && styles.chipActive, { borderColor: colors.primary, backgroundColor: active ? colors.primary : 'transparent' }]}
                onPress={() => toggleCrop(crop.id)}
                activeOpacity={0.8}
                disabled={!editing}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive, { color: active ? colors.white : editing ? colors.primary : colors.textMuted }]}>{t(crop.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!editing && (
          <TouchableOpacity
            style={[styles.editBtnBottom, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={handleEditPress}
          >
            <Ionicons name="create-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={[styles.editBtnText, { color: colors.white }]}>{t('editProfile')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFill: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center', position: 'relative' },
  headerEditActions: {
    position: 'absolute',
    top: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionText: { fontSize: 17, fontWeight: '600' },
  saveBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnTextSmall: { fontWeight: '700', fontSize: 15 },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 8,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 20, fontWeight: '800' },
  subLabel: { fontSize: 14, marginTop: 2, letterSpacing: 0.5 },
  card: { margin: 16, borderRadius: 14, padding: 18 },
  cardTitle: { fontWeight: '800', fontSize: 18, marginBottom: 14 },
  fieldLabel: { fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputActive: {
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  inputReadOnly: {
    borderWidth: 0,
  },
  sectionTitle: { fontWeight: '800', fontSize: 18, marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: 16, marginBottom: 28 },
  chip: { 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 20, 
    paddingVertical: 14,
    minWidth: '45%',
    alignItems: 'center',
  },
  chipActive: {},
  chipText: { fontWeight: '700', fontSize: 15 },
  chipTextActive: {},
  editBtnBottom: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtnText: { fontWeight: '800', fontSize: 17 },
});