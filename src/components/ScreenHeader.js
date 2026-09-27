// src/components/ScreenHeader.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { darkColors } from '../theme/colors';

const fallbackColors = darkColors;

export default function ScreenHeader({ title, right, subtitle }) {
  const colors = useColors();
  return (
    <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
      <View>
        <Text style={[styles.title, { color: colors.white }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: '#DCEEDC' }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function HeaderPill({ label, onPress }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.pill, { backgroundColor: colors.white }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.pillText, { color: colors.primaryDark }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { fontWeight: '700', fontSize: 14 },
});
