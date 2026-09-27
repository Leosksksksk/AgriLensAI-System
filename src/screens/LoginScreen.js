// src/screens/LoginScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../supabaseClient';
import { useLanguage } from '../context/LanguageContext';

const PREVIOUS_USER_KEY = '@previous_user_credentials';

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
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(null);

  // Load saved previous user credentials on mount
  useEffect(() => {
    const loadPreviousUser = async () => {
      try {
        const saved = await AsyncStorage.getItem(PREVIOUS_USER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) {
            setSavedCredentials(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load previous user:', e);
      }
    };
    loadPreviousUser();
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
      Alert.alert(t('requiredFieldTitle'), t('requiredFullNameDesc'));
      return;
    }

    if (!barangay.trim()) {
      Alert.alert(t('requiredFieldTitle'), t('requiredBarangayDesc'));
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

      // Save user profile fields locally using MATCHING keys for the Profile Dashboard
      await AsyncStorage.setItem('user_full_name', cleanName);
      await AsyncStorage.setItem('user_barangay', cleanBarangay);
      await AsyncStorage.setItem('user_email', cleanEmail);
      if (cleanPhone) {
        await AsyncStorage.setItem('user_phone', cleanPhone);
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

      // Save credentials for future "Previous User" suggestion
      await savePreviousUserCredentials();

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
          t('pleaseWaitTitle'),
          t('pleaseWaitDesc')
        );
      } else {
        Alert.alert(t('loginFailedTitle'), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save credentials for future "Previous User" suggestion
  const savePreviousUserCredentials = useCallback(async () => {
    try {
      const credentials = {
        fullName: fullName.trim(),
        barangay: barangay.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      await AsyncStorage.setItem(PREVIOUS_USER_KEY, JSON.stringify(credentials));
    } catch (e) {
      console.warn('Failed to save previous user:', e);
    }
  }, [fullName, barangay, email, phone]);

  const hideAllDropdowns = useCallback(() => {
    setShowSuggestion(false);
    setShowBarangayDropdown(false);
    setShowEmailDropdown(false);
    setShowPhoneDropdown(false);
  }, []);

  const fillNameFromSuggestion = useCallback(() => {
    if (savedCredentials?.fullName) {
      setFullName(savedCredentials.fullName);
      setShowSuggestion(false);
    }
  }, [savedCredentials]);

  const fillBarangayFromSuggestion = useCallback(() => {
    if (savedCredentials?.barangay) {
      setBarangay(savedCredentials.barangay);
      setShowBarangayDropdown(false);
    }
  }, [savedCredentials]);

  const fillEmailFromSuggestion = useCallback(() => {
    if (savedCredentials?.email) {
      setEmail(savedCredentials.email);
      setShowEmailDropdown(false);
    }
  }, [savedCredentials]);

  const fillPhoneFromSuggestion = useCallback(() => {
    if (savedCredentials?.phone) {
      setPhone(savedCredentials.phone);
      setShowPhoneDropdown(false);
    }
  }, [savedCredentials]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primaryDark }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.headerContainer, { backgroundColor: colors.primaryDark }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={38} color="#4CD964" />
          </View>
          <Text style={[styles.appName, { color: colors.white }]}>{t('appName')}</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('signInTagline')}</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: colors.background }]}>
          {/* Full Name Input */}
          <Text style={[styles.label, { color: colors.textDark }]}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.fullInput, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder=""
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => {
                if (!fullName.trim() && savedCredentials?.fullName) {
                  setShowSuggestion(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestion(false), 200)}
              editable={!loading}
            />
            {showSuggestion && savedCredentials?.fullName && !fullName.trim() && (
              <TouchableOpacity
                style={[
                  styles.suggestionDropdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={fillNameFromSuggestion}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, { color: colors.textDark }]}>
                  {savedCredentials.fullName}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Barangay Input */}
          <Text style={[styles.label, { color: colors.textDark }]}>Barangay</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.fullInput, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder=""
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              value={barangay}
              onChangeText={setBarangay}
              onFocus={() => {
                if (!barangay.trim() && savedCredentials?.barangay) {
                  setShowBarangayDropdown(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowBarangayDropdown(false), 200)}
              editable={!loading}
            />
            {showBarangayDropdown && savedCredentials?.barangay && !barangay.trim() && (
              <TouchableOpacity
                style={[
                  styles.suggestionDropdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={fillBarangayFromSuggestion}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, { color: colors.textDark }]}>
                  {savedCredentials.barangay}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Email Address Input */}
          <Text style={[styles.label, { color: colors.textDark }]}>{t('emailAddress')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.fullInput, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder=""
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => {
                if (!email.trim() && savedCredentials?.email) {
                  setShowEmailDropdown(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowEmailDropdown(false), 200)}
              editable={!loading}
            />
            {showEmailDropdown && savedCredentials?.email && !email.trim() && (
              <TouchableOpacity
                style={[
                  styles.suggestionDropdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={fillEmailFromSuggestion}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, { color: colors.textDark }]}>
                  {savedCredentials.email}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>{t('smsHelperText')}</Text>

          {/* Mobile Number Input */}
          <Text style={[styles.label, { color: colors.textDark }]}>{t('mobileNumber')}</Text>
          <View style={styles.phoneRow}>
            <View style={[styles.prefixContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.prefixText, { color: colors.textDark }]}>+63</Text>
            </View>
            <View style={[styles.phoneInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.phoneInput, { color: colors.textDark }]}
                placeholder=""
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => {
                  if (!phone.trim() && savedCredentials?.phone) {
                    setShowPhoneDropdown(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowPhoneDropdown(false), 200)}
                maxLength={12}
                editable={!loading}
              />
              {showPhoneDropdown && savedCredentials?.phone && !phone.trim() && (
                <TouchableOpacity
                  style={[
                    styles.suggestionDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={fillPhoneFromSuggestion}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionText, { color: colors.textDark }]}>
                    {savedCredentials.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || cooldown > 0) && styles.primaryBtnDisabled,
              { backgroundColor: colors.primary }
            ]}
            activeOpacity={0.85}
            onPress={handleSendOTP}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[
                styles.primaryBtnText,
                cooldown > 0 && styles.resendText,
                { color: colors.white }
              ]}>
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
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerContainer: {
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
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  fullInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 19,
  },
  phoneRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  prefixContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  prefixText: {
    fontSize: 19,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  phoneInput: {
    paddingVertical: 16,
    fontSize: 19,
  },
  helperText: {
    fontSize: 16,
    marginTop: -8,
    marginBottom: 16,
  },
  primaryBtn: {
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBtnDisabled: {
    backgroundColor: '#1B5E20',
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '600',
  },
  resendText: {
    fontWeight: '700',
    fontSize: 20,
  },
  suggestionDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});