// src/components/SeverityRing.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

export default function SeverityRing({ percent = 0, color = colors.warning, size = 150, label = '' }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
        {label ? <Text style={styles.subLabel}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: { position: 'absolute', alignItems: 'center' },
  percentText: { fontSize: 30, fontWeight: '800', color: colors.textDark },
  subLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center', maxWidth: 100 },
});
