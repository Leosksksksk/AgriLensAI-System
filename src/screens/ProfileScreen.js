// src/screens/ProfileScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const ALL_CROPS = ['Tomato Leaf', 'Rice Plant', 'Corn Stalk', 'Eggplant Leaf', 'Banana', 'Mango'];

export default function ProfileScreen() {
  const [fullName, setFullName] = useState('Junrel Alipogpog');
  const [phone, setPhone] = useState('+63 917 123 4567');
  const [barangay, setBarangay] = useState('Bogo City Cebu');
  const [farmSize, setFarmSize] = useState('2.5 hectares');
  const [selectedCrops, setSelectedCrops] = useState(['Tomato Leaf', 'Rice Plant', 'Corn Stalk', 'Eggplant Leaf']);

  function toggleCrop(crop) {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.white} />
          </View>
          <Text style={styles.name}>Junrel Alipogpog</Text>
          <Text style={styles.subLabel}>FARM · Bogo City</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Barangay</Text>
          <TextInput style={styles.input} value={barangay} onChangeText={setBarangay} />

          <Text style={styles.fieldLabel}>Farm Size</Text>
          <TextInput style={styles.input} value={farmSize} onChangeText={setFarmSize} />
        </View>

        <Text style={styles.sectionTitle}>Crop Types</Text>
        <View style={styles.chipRow}>
          {ALL_CROPS.map((crop) => {
            const active = selectedCrops.includes(crop);
            return (
              <TouchableOpacity
                key={crop}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCrop(crop)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{crop}</Text>
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
  card: { backgroundColor: colors.white, margin: 20, borderRadius: 14, padding: 18 },
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