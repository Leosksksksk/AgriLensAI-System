// src/screens/OtpVerifyScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../supabaseClient';
import { useLanguage } from '../context/LanguageContext';

export default function OtpVerifyScreen({ route, navigation }) {
  const { t, language } = useLanguage();
  const { colors } = useTheme();

  const { email, phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('invalidCodeTitle'), t('invalidCodeDesc'));
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email',
      });

      if (error) throw error;

      const userId = data.session.user.id;

      // Always upsert farmer record (create or update)
      const { error: upsertError } = await supabase.from('farmers').upsert(
        { id: userId, email, phone, preferred_language: language },
        { onConflict: 'id' }
      );

      if (upsertError) throw upsertError;

      // Always go to Onboarding screen for every login
      navigation.replace('Onboarding');

    } catch (error) {
      Alert.alert(t('verificationFailedTitle'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Text style={styles.iconText}>✉️</Text>
        </View>

        <Text style={[styles.title, { color: colors.textDark }]}>{t('checkYourEmail')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('otpSentTo')} {'\n'}
          <Text style={[styles.boldText, { color: colors.textDark }]}>{email}</Text>
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.card, borderColor: colors.primary, color: colors.textDark }]}
            placeholder="000000"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.verifyBtnText, { color: colors.white }]}>{t('verifyCode')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
        >
           <Text style={[styles.backBtnText, { color: colors.primaryLight }]}>{t('useDifferentEmail')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  headerIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconText: { fontSize: 34 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 17, marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  boldText: { fontWeight: '700' },
  inputContainer: { width: '100%', marginBottom: 32 },
  codeInput: { borderWidth: 2, borderRadius: 12, padding: 20, fontSize: 34, fontWeight: '800', letterSpacing: 8 },
  verifyBtn: { width: '100%', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  verifyBtnText: { fontWeight: '800', fontSize: 20 },
  backBtn: { padding: 12 },
  backBtnText: { fontWeight: '700', fontSize: 17 },
});