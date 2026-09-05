// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const { language, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Palihug pagbutang og sakto nga email address.');
      return;
    }

    try {
      setLoading(true);
      
      // Request the 6-digit OTP via Email
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      if (error) throw error;

      // Navigate to the verification screen and pass the contact details
      navigation.navigate('OtpVerify', { email: email.trim(), phone });
      
    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* TOP HEADER SECTION (Green) */}
      <View style={styles.headerContainer}>
        {/* Optional Settings Icon from your screenshot */}
        <TouchableOpacity style={styles.settingsIcon}>
          <Ionicons name="settings-sharp" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="leaf" size={36} color="#4CD964" />
        </View>
        <Text style={styles.appName}>{t('appName', language)}</Text>
        <Text style={styles.tagline}>Sign in para sa protektado nga datos sa tanom</Text>
      </View>

      {/* BOTTOM FORM SECTION (White) */}
      <View style={styles.formContainer}>
        
        {/* NEW EMAIL FIELD */}
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.fullInput}
            placeholder="farmer@example.com"
            placeholderTextColor="#A0A0A0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* EXISTING MOBILE NUMBER FIELD */}
        <Text style={styles.label}>Numero sa Mobile (Optional)</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>+63</Text>
          </View>
          <View style={styles.phoneInputContainer}>
            <TextInput
              style={styles.phoneInput}
              placeholder="9XX XXX XXXX"
              placeholderTextColor="#A0A0A0"
              keyboardType="number-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={12}
            />
          </View>
        </View>
        
        {/* Updated helper text to mention email */}
        <Text style={styles.helperText}>Magpadala kami og one-time verification code sa email.</Text>

        {/* BUTTONS */}
        <TouchableOpacity 
          style={styles.primaryBtn} 
          activeOpacity={0.85} 
          onPress={handleSendOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Sugdi</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryBtn} 
          onPress={() => navigation.navigate('MainTabs')}
        >
           <Text style={styles.secondaryBtnText}>Padayon isip Bisita</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2A5D34', // Matches your green header background
  },
  headerContainer: {
    backgroundColor: '#2A5D34',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  settingsIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 8,
    borderRadius: 20,
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#E0EAE1',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  label: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  fullInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333333',
  },
  phoneRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  prefixContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  prefixText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  phoneInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  phoneInput: {
    paddingVertical: 14,
    fontSize: 15,
    color: '#333333',
  },
  helperText: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#387C44',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#387C44',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#387C44',
    fontSize: 16,
    fontWeight: '600',
  },
});