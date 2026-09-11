// src/screens/ProfileScreen.js
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';

const ALL_CROPS = [
  { id: 'tomato', labelKey: 'cropTomato' },
  { id: 'rice', labelKey: 'cropRice' },
  { id: 'corn', labelKey: 'cropCorn' },
  { id: 'eggplant', labelKey: 'cropEggplant' },
  { id: 'banana', labelKey: 'cropBanana' },
  { id: 'mango', labelKey: 'cropMango' },
];

export default function ProfileScreen() {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [selectedCropIds, setSelectedCropIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (e) {
      console.warn('Profile load error:', e);
    } finally {
      setLoading(false);
    }
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
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (e) {
      console.warn('Profile save error:', e);
      Alert.alert(t('profileErrorTitle'), e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCrop(cropId) {
    setSelectedCropIds((prev) =>
      prev.includes(cropId) ? prev.filter((c) => c !== cropId) : [...prev, cropId]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerFill]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.white} />
          </View>
          <Text style={styles.name}>{fullName || t('fullName')}</Text>
          <Text style={styles.subLabel}>{t('farmLabel')} · {barangay || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('personalInfo')}</Text>

          <Text style={styles.fieldLabel}>{t('fullName')}</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('fullName')}
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.fieldLabel}>{t('phoneNumber')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+63 9XX XXX XXXX"
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.fieldLabel}>{t('barangay')}</Text>
          <TextInput
            style={styles.input}
            value={barangay}
            onChangeText={setBarangay}
            placeholder={t('barangay')}
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.fieldLabel}>{t('farmSize')}</Text>
          <TextInput
            style={styles.input}
            value={farmSize}
            onChangeText={setFarmSize}
            placeholder={t('farmSize')}
            placeholderTextColor={colors.textLight}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('cropTypes')}</Text>
        <View style={styles.chipRow}>
          {ALL_CROPS.map((crop) => {
            const active = selectedCropIds.includes(crop.id);
            return (
              <TouchableOpacity
                key={crop.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCrop(crop.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(crop.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{t('saveProfile')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerFill: { alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.primaryDark, alignItems: 'center', paddingTop: 54, paddingBottom: 26 },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: { color: colors.white, fontSize: 18, fontWeight: '800' },
  subLabel: { color: '#DCEEDC', fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, margin: 20, borderRadius: 14, padding: 18 },
  cardTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textDark,
  },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginHorizontal: 20, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginBottom: 24 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.white },
  saveBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});