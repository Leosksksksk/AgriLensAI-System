// src/components/ScreenHeader.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export default function ScreenHeader({ title, right, subtitle }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function HeaderPill({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#DCEEDC', fontSize: 13, marginTop: 2 },
  pill: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
});
