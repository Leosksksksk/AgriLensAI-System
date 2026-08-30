// src/screens/OnboardingScreen.js
// import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const STEPS = [
  {
    icon: 'camera-outline',
    title: '1. Scan your leaf',
    desc: "Position your crop's leaf in the camera viewfinder.",
  },
  {
    icon: 'sparkles-outline',
    title: '2. Get instant diagnosis',
    desc: 'Our offline AI analyzes severity immediately without internet.',
  },
  {
    icon: 'book-outline',
    title: '3. Follow treatment guide',
    desc: 'Apply recommended actions and organic solutions.',
  },
];

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LeafScan</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>How it works</Text>
        <Text style={styles.subheading}>Identify and address diseases in three easy steps</Text>

        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.getStartedBtn}
        activeOpacity={0.85}
        onPress={() => navigation.replace('MainTabs')}
      >
        <Text style={styles.getStartedText}>Get Started</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 18, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  heading: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  subheading: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 26 },
  stepRow: { flexDirection: 'row', marginBottom: 26, alignItems: 'flex-start' },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepText: { flex: 1 },
  stepTitle: { fontWeight: '700', fontSize: 15, color: colors.textDark, marginBottom: 3 },
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
