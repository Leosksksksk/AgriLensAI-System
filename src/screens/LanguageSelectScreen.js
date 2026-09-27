// src/screens/LanguageSelectScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Explicitly define only the real language choices here
const AVAILABLE_LANGUAGES = [
  { id: 'en', label: 'ENGLISH' },
  { id: 'fil', label: 'FILIPINO' },
  { id: 'ceb', label: 'BISAYA' },
];

export default function LanguageSelectScreen({ navigation }) {
  const { language, setLanguage, t } = useLanguage();
  const { colors } = useTheme();
  const [selected, setSelected] = useState(language || 'en');

  function handleContinue() {
    setLanguage(selected);
    navigation.replace('Login');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoCircle, { backgroundColor: colors.card }]}>
          <Ionicons name="globe-outline" size={34} color={colors.primaryLight || colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textDark }]}>{t('chooseLanguageTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('chooseLanguageSubtitle')}</Text>

        <View style={styles.optionsList}>
          {AVAILABLE_LANGUAGES.map((lang) => {
            const active = selected === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.option, active && styles.optionActive, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setSelected(lang.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive, { color: active ? colors.white : colors.textDark }]}>
                  {lang.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={[styles.continueBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85} onPress={handleContinue}>
        <Text style={[styles.continueBtnText, { color: colors.white }]}>{t('continueBtn')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    fontSize: 15,
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
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  optionActive: {},
  optionText: { fontSize: 18, fontWeight: '700' },
  optionTextActive: {},
  continueBtn: {
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueBtnText: { fontWeight: '800', fontSize: 17 },
});