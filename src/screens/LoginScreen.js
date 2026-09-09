// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { supabase } from '../../supabaseClient';
import { useLanguage } from '../context/LanguageContext';

function formatPhoneNumber(input) {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 10);

  if (digits.length <= 3) return part1;
  if (digits.length <= 6) return `${part1} ${part2}`;
  return `${part1} ${part2} ${part3}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen({ navigation }) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Load saved user credentials on screen load
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedName = await AsyncStorage.getItem('userFullName');
        const savedBarangay = await AsyncStorage.getItem('userBarangay');
        const savedEmail = await AsyncStorage.getItem('userEmail');
        const savedPhone = await AsyncStorage.getItem('userPhone');

        if (savedName) setFullName(savedName);
        if (savedBarangay) setBarangay(savedBarangay);
        if (savedEmail) setEmail(savedEmail);
        if (savedPhone) setPhone(savedPhone);
      } catch (error) {
        console.warn('Failed to load saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  // Handle 60-second cooldown timer for resending OTP
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleSendOTP = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your Full Name.');
      return;
    }

    if (!barangay.trim()) {
      Alert.alert('Required Field', 'Please enter your Barangay.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(t('invalidEmailTitle'), t('invalidEmailDesc'));
      return;
    }

    try {
      setLoading(true);

      const cleanName = fullName.trim();
      const cleanBarangay = barangay.trim();
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim();

      // Save user profile fields locally to the device
      await AsyncStorage.setItem('userFullName', cleanName);
      await AsyncStorage.setItem('userBarangay', cleanBarangay);
      await AsyncStorage.setItem('userEmail', cleanEmail);
      if (cleanPhone) {
        await AsyncStorage.setItem('userPhone', cleanPhone);
      }

      // Pass user metadata to Supabase Authentication
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          data: {
            full_name: cleanName,
            barangay: cleanBarangay,
            phone: cleanPhone,
          },
        },
      });

      if (error) throw error;

      // Activate 60-second button cooldown
      setCooldown(60);

      navigation.navigate('OtpVerify', { 
        email: cleanEmail, 
        phone: cleanPhone,
        fullName: cleanName,
        barangay: cleanBarangay,
      });

    } catch (error) {
      console.warn(error);

      // Clean alert for Supabase email rate limits
      if (error.message && error.message.includes('security purposes')) {
        Alert.alert(
          'Please Wait',
          'A verification code was recently requested. Please wait a few seconds before trying again.'
        );
      } else {
        Alert.alert(t('loginFailedTitle'), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={36} color="#4CD964" />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('signInTagline')}</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Full Name Input */}
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.fullInput}
              placeholder="Juan Dela Cruz"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          {/* Barangay Input */}
          <Text style={styles.label}>Barangay</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.fullInput}
              placeholder="e.g. Banban"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              value={barangay}
              onChangeText={setBarangay}
              editable={!loading}
            />
          </View>

          {/* Email Address Input */}
          <Text style={styles.label}>{t('emailAddress')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.fullInput}
              placeholder="farmer@example.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>
          <Text style={styles.helperText}>{t('smsHelperText')}</Text>

          {/* Mobile Number Input */}
          <Text style={styles.label}>{t('mobileNumber')} (Optional)</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixContainer}>
              <Text style={styles.prefixText}>+63</Text>
            </View>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={styles.phoneInput}
                placeholder="9XX XXX XXXX"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={12}
                editable={!loading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, (loading || cooldown > 0) && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleSendOTP}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : t('sendVerificationCode')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  fullInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.card,
  },
  phoneRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  prefixContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: colors.card,
  },
  prefixText: {
    fontSize: 15,
    color: colors.textDark,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  phoneInput: {
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textDark,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.6 },
});