// src/screens/LoginScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('917 123 4567');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLeaf}>🌿</Text>
        </View>
        <Text style={styles.appName}>LeafScan</Text>
        <Text style={styles.tagline}>Sign in to secure crop data</Text>
      </View>

      <View style={styles.formWrapper}>
        <View style={styles.form}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+63</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="9XX XXX XXXX"
            />
          </View>
          <Text style={styles.helperText}>We will send a one-time verification SMS.</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.replace('Onboarding')}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.replace('MainTabs')}
          >
            <Text style={styles.secondaryBtnText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  hero: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoLeaf: { fontSize: 32 },
  appName: { color: colors.white, fontSize: 26, fontWeight: '800' },
  tagline: { color: '#DCEEDC', fontSize: 14, marginTop: 6 },
  formWrapper: { flex: 1, backgroundColor: colors.white },
  form: { paddingHorizontal: 24, paddingTop: 32, backgroundColor: colors.white },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCode: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  countryCodeText: { fontWeight: '700', color: colors.textDark },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
  },
  helperText: { fontSize: 12, color: colors.textLight, marginTop: 8, marginBottom: 26 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
});