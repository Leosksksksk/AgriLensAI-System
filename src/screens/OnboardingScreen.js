// src/screens/OnboardingScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';

export default function OnboardingScreen({ navigation }) {
  const { t } = useLanguage();

  const [saving, setSaving] = useState(false);

  const STEPS = [
    { icon: 'camera-outline', titleKey: 'step1Title', descKey: 'step1Desc' },
    { icon: 'sparkles-outline', titleKey: 'step2Title', descKey: 'step2Desc' },
    { icon: 'book-outline', titleKey: 'step3Title', descKey: 'step3Desc' },
  ];

  async function handleGetStarted() {
    setSaving(true);
    try {
      // Get the fullName that was already saved during login
      const fullName = await AsyncStorage.getItem('user_full_name');
      if (!fullName) throw new Error('Name not found. Please log in again.');

      // Sync with Supabase database
      const { user } = await getValidUserSession();
      if (!user) throw new Error('No active session. Please log in again.');

      const { error } = await supabase.from('farmers').upsert(
        {
          id: user.id,
          full_name: fullName,
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
                <Ionicons name={step.icon} size={22} color={colors.stepIconGreen} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                <Text style={styles.stepDesc}>{t(step.descKey)}</Text>
              </View>
            </View>
          ))}
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
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: '800' },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.stepIconGreen },
  subheading: { fontSize: 16, color: colors.textMuted, marginTop: 4, marginBottom: 26 },
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
  stepTitle: { fontWeight: '700', fontSize: 17, color: colors.stepIconGreen, marginBottom: 3 },
  stepDesc: { fontSize: 15, color: colors.textMuted, lineHeight: 20 },
  getStartedBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  getStartedBtnDisabled: { opacity: 0.6 },
  getStartedText: { color: colors.white, fontWeight: '800', fontSize: 17 },
});