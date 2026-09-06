// src/screens/ProfileScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

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

  const [fullName, setFullName] = useState('Junrel Alipogpog');
  const [phone, setPhone] = useState('+63 9xx xxx xxxx');
  const [barangay, setBarangay] = useState('Bogo City Cebu');
  const [farmSize, setFarmSize] = useState('2.5 hectares');
  const [selectedCropIds, setSelectedCropIds] = useState(['tomato', 'rice', 'corn', 'eggplant']);

  function toggleCrop(cropId) {
    setSelectedCropIds((prev) =>
      prev.includes(cropId) ? prev.filter((c) => c !== cropId) : [...prev, cropId]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.white} />
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.subLabel}>{t('farmLabel')} · {barangay}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('personalInfo')}</Text>

          <Text style={styles.fieldLabel}>{t('fullName')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.fieldLabel}>{t('phoneNumber')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>{t('barangay')}</Text>
          <TextInput style={styles.input} value={barangay} onChangeText={setBarangay} />

          <Text style={styles.fieldLabel}>{t('farmSize')}</Text>
          <TextInput style={styles.input} value={farmSize} onChangeText={setFarmSize} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.white },
});