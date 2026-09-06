// src/screens/OnboardingScreen.js
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

export default function OnboardingScreen({ navigation }) {
  const { t } = useLanguage();

  const STEPS = [
    { icon: 'camera-outline', titleKey: 'step1Title', descKey: 'step1Desc' },
    { icon: 'sparkles-outline', titleKey: 'step2Title', descKey: 'step2Desc' },
    { icon: 'book-outline', titleKey: 'step3Title', descKey: 'step3Desc' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
      </View>

      <View style={styles.content}>
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
      </View>

      <TouchableOpacity
        style={styles.getStartedBtn}
        activeOpacity={0.85}
        onPress={() => navigation.replace('MainTabs')}
      >
        <Text style={styles.getStartedText}>{t('getStarted')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 18, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
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
  getStartedBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  getStartedText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});