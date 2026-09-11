// src/screens/LanguageSelectScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

// Explicitly define only the real language choices here
const AVAILABLE_LANGUAGES = [
  { id: 'en', label: 'ENGLISH' },
  { id: 'fil', label: 'FILIPINO' },
  { id: 'ceb', label: 'BISAYA' },
];

export default function LanguageSelectScreen({ navigation }) {
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState(language || 'en');

  function handleContinue() {
    setLanguage(selected);
    navigation.replace('Login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="globe-outline" size={32} color={colors.primaryLight || colors.primary} />
        </View>

        <Text style={styles.title}>{t('chooseLanguageTitle')}</Text>
        <Text style={styles.subtitle}>{t('chooseLanguageSubtitle')}</Text>

        <View style={styles.optionsList}>
          {AVAILABLE_LANGUAGES.map((lang) => {
            const active = selected === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(lang.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {lang.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.white} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={handleContinue}>
        <Text style={styles.continueBtnText}>{t('continueBtn')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.white, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  optionsList: { width: '100%', gap: 12 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.card,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.white },
  optionTextActive: { color: colors.white },
  continueBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});