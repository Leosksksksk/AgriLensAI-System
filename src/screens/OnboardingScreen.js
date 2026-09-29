// src/screens/OnboardingScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';
import { useAppAlert } from '../context/AppAlertContext';

export default function OnboardingScreen({ navigation }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const Alert = useAppAlert();

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>{t('appName')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.heading, { color: colors.stepIconGreen }]}>{t('howItWorks')}</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>{t('onboardingSubheading')}</Text>

          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: colors.card }]}>
                <Ionicons name={step.icon} size={24} color={colors.stepIconGreen} />
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepTitle, { color: colors.stepIconGreen }]}>{t(step.titleKey)}</Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>{t(step.descKey)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        style={[styles.getStartedBtn, saving && styles.getStartedBtnDisabled, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
        onPress={handleGetStarted}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={[styles.getStartedText, { color: colors.white }]}>{t('getStarted')}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  heading: { fontSize: 26, fontWeight: '800' },
  subheading: { fontSize: 18, marginTop: 4, marginBottom: 26 },
  stepRow: { flexDirection: 'row', marginBottom: 26, alignItems: 'flex-start' },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepText: { flex: 1 },
  stepTitle: { fontWeight: '700', fontSize: 19, marginBottom: 3 },
  stepDesc: { fontSize: 17, lineHeight: 22 },
  getStartedBtn: {
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  getStartedBtnDisabled: { opacity: 0.6 },
  getStartedText: { fontWeight: '800', fontSize: 19 },
});