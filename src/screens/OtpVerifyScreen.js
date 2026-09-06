// src/screens/OtpVerifyScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { supabase } from '../../supabaseClient';
import { useLanguage } from '../context/LanguageContext';

export default function OtpVerifyScreen({ route, navigation }) {
  const { t, language } = useLanguage();

  // Grab the email and phone passed over from LoginScreen
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

      // Verify the 6-digit OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email',
      });

      if (error) throw error;

      const userId = data.session.user.id;

      // Create/update the matching farmers profile row — required because
      // scan_results.farmer_id has a foreign key pointing to farmers.id.
      // Skipping this step causes every future scan upload to fail.
      const { error: upsertError } = await supabase.from('farmers').upsert(
        { id: userId, email, phone, preferred_language: language },
        { onConflict: 'id' }
      );

      if (upsertError) throw upsertError;

      // If successful, take them to the main app (or Onboarding)
      navigation.replace('MainTabs');

    } catch (error) {
      //console.error(error);
      Alert.alert(t('verificationFailedTitle'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerIcon}>
          <Text style={styles.iconText}>✉️</Text>
        </View>

        <Text style={styles.title}>{t('checkYourEmail')}</Text>
        <Text style={styles.subtitle}>
          {t('otpSentTo')} {'\n'}
          <Text style={styles.boldText}>{email}</Text>
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#8FA893"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={styles.verifyBtn}
          activeOpacity={0.85}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.verifyBtnText}>{t('verifyCode')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
           <Text style={styles.backBtnText}>{t('useDifferentEmail')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  headerIcon: { width: 80, height: 80, backgroundColor: '#DCEEDC', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconText: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primaryDark, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#4A5D4E', marginBottom: 32, textAlign: 'center', lineHeight: 22 },
  boldText: { fontWeight: '700', color: colors.primaryDark },
  inputContainer: { width: '100%', marginBottom: 32 },
  codeInput: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary, borderRadius: 12, padding: 20, fontSize: 32, fontWeight: '800', color: colors.primaryDark, letterSpacing: 8 },
  verifyBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  verifyBtnText: { color: colors.white, fontWeight: '800', fontSize: 18 },
  backBtn: { padding: 12 },
  backBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});