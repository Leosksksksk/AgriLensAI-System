// src/screens/OnboardingScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';

export default function OnboardingScreen({ navigation }) {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [saving, setSaving] = useState(false);

  const STEPS = [
    { icon: 'camera-outline', titleKey: 'step1Title', descKey: 'step1Desc' },
    { icon: 'sparkles-outline', titleKey: 'step2Title', descKey: 'step2Desc' },
    { icon: 'book-outline', titleKey: 'step3Title', descKey: 'step3Desc' },
  ];

  async function handleGetStarted() {
    if (!fullName.trim()) {
      Alert.alert(t('nameRequiredTitle'), t('nameRequiredDesc'));
      return;
    }

    setSaving(true);
    try {
      const trimmedName = fullName.trim();
      const trimmedBarangay = barangay.trim() || '';

      // 1. Save locally to AsyncStorage so ProfileScreen reads it instantly
      await AsyncStorage.setItem('user_full_name', trimmedName);
      if (trimmedBarangay) {
        await AsyncStorage.setItem('user_barangay', trimmedBarangay);
      }

      // 2. Sync with Supabase database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session.');

      const { error } = await supabase.from('farmers').upsert(
        {
          id: user.id,
          full_name: trimmedName,
          barangay: trimmedBarangay || null,
        },
        { onConflict: 'id' }
      );

      if (error) throw error;

      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert(t('onboardingSaveErrorTitle'), e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{t('howItWorks')}</Text>
          <Text style={styles.subheading}>{t('onboardingSubheading')}</Text>

          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={22} color={colors.primaryLight} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                <Text style={styles.stepDesc}>{t(step.descKey)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.formCard}>
            <Text style={styles.formHeading}>{t('tellUsAboutYou')}</Text>

            <Text style={styles.fieldLabel}>{t('fullName')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('fullNamePlaceholder')}
              placeholderTextColor={colors.textLight}
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>{t('barangay')}</Text>
            <TextInput
              style={styles.input}
              value={barangay}
              onChangeText={setBarangay}
              placeholder={t('barangayPlaceholder')}
              placeholderTextColor={colors.textLight}
              editable={!saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        style={[styles.getStartedBtn, saving && styles.getStartedBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleGetStarted}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.getStartedText}>{t('getStarted')}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 18, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: colors.white },
  subheading: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 26 },
  stepRow: { flexDirection: 'row', marginBottom: 26, alignItems: 'flex-start' },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepText: { flex: 1 },
  stepTitle: { fontWeight: '700', fontSize: 15, color: colors.white, marginBottom: 3 },
  stepDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
  },
  formHeading: { fontWeight: '800', fontSize: 15, color: colors.white, marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textDark,
  },
  getStartedBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  getStartedBtnDisabled: { opacity: 0.6 },
  getStartedText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});