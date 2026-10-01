// src/components/UpdateNotificationBanner.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function UpdateNotificationBanner({ visible, isCritical, onDismiss, onUpdateNow }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onDismiss) onDismiss();
      });
    }
  }, [visible, onDismiss]);

  if (!visible && translateY._value === -120) {
    return null;
  }

  const animatedStyle = {
    transform: [
      { translateY },
      { scale },
    ],
    opacity,
  };

  const shadowColor = isDark ? '#000000' : '#000000';
  const cardBg = isDark ? colors.card : '#FFFFFF';
  const borderColor = isCritical ? colors.danger : colors.border;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={[styles.card, { backgroundColor: cardBg, shadowColor, elevation: 6, borderColor, borderWidth: isCritical ? 2 : 1 }]}>
        <View style={styles.contentRow}>
          <View style={[styles.iconWrapper, { backgroundColor: (isCritical ? colors.danger : colors.primary) + '1A' }]}>
            <Ionicons name={isCritical ? 'alert-circle-outline' : 'cloud-download-outline'} size={22} color={isCritical ? colors.danger : colors.primary} />
          </View>

          <View style={styles.textSection}>
            <Text style={[styles.title, { color: colors.textDark }]}>{isCritical ? t('updateCriticalTitle') : t('updateAvailableTitle')}</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>{isCritical ? t('updateCriticalDesc') : t('updateAvailableDesc')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.buttonRow}>
          {!isCritical && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textDark }]}>
                {t('later') || 'Later'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: isCritical ? colors.danger : colors.primary }]}
            onPress={onUpdateNow}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: colors.white }]}>{t('updateNow') || 'Update Now'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 24,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textSection: {
    flex: 1,
    minWidth: 0,
  },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  description: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1, marginVertical: 12 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800' },
});

export { styles };