// src/screens/LanguageSelectScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelectScreen({ navigation }) {
  const { language, setLanguage, languages, languageLabels, t } = useLanguage();
  const [selected, setSelected] = useState(language);

  function handleContinue() {
    setLanguage(selected);
    navigation.replace('Login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="globe-outline" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('chooseLanguageTitle')}</Text>
        <Text style={styles.subtitle}>{t('chooseLanguageSubtitle')}</Text>

        <View style={styles.optionsList}>
          {languages.map((lang) => {
            const active = selected === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(lang)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {languageLabels[lang]}
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
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark, textAlign: 'center' },
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
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.textDark },
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