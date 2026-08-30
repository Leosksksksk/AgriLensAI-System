// src/screens/ClimateScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskColor } from '../theme/colors';

const FORECAST = [
  { day: 'Today', temp: '32°C', icon: 'rainy-outline', risk: 'High Risk' },
  { day: 'Tomorrow', temp: '28°C', icon: 'sunny-outline', risk: 'Low Risk' },
  { day: 'Wednesday', temp: '30°C', icon: 'cloudy-outline', risk: 'Moderate Risk' },
];

export default function ClimateScreen({ location = 'Bogo City Cebu' }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Climate</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.white} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="sunny" size={18} color="#F5A623" />
            <Text style={styles.metricLabel}>Temperature</Text>
            <Text style={styles.metricValue}>32°C</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="water" size={18} color="#1565C0" />
            <Text style={styles.metricLabel}>Humidity</Text>
            <Text style={styles.metricValue}>85%</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="rainy" size={18} color="#1E88E5" />
            <Text style={styles.metricLabel}>Rainfall</Text>
            <Text style={styles.metricValue}>12mm</Text>
          </View>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.riskTitle}>HIGH RISK</Text>
            <Text style={styles.riskDesc}>Conditions are favorable for rapid disease spread</Text>
            <TouchableOpacity>
              <Text style={styles.riskLink}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>7-Day Forecast</Text>

        {FORECAST.map((f, i) => (
          <View key={i} style={styles.forecastRow}>
            <View>
              <Text style={styles.forecastDay}>{f.day}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <Text style={styles.forecastTemp}>{f.temp}</Text>
                <Ionicons name={f.icon} size={16} color={colors.textMuted} />
              </View>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskColor(f.risk) }]}>
              <Text style={styles.riskBadgeText}>{f.risk}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  locationText: { color: '#DCEEDC', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 12, alignItems: 'flex-start', gap: 6 },
  metricLabel: { fontSize: 11, color: colors.textMuted },
  metricValue: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  riskCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  riskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginRight: 10, marginTop: 4 },
  riskTitle: { color: colors.danger, fontWeight: '800', fontSize: 13, marginBottom: 4 },
  riskDesc: { color: '#7A2E2A', fontSize: 13, marginBottom: 6 },
  riskLink: { color: colors.danger, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: colors.textDark, marginBottom: 12 },
  forecastRow: {
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastDay: { fontWeight: '700', color: colors.textDark, fontSize: 14 },
  forecastTemp: { color: colors.textMuted, fontSize: 13 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  riskBadgeText: { color: colors.white, fontWeight: '700', fontSize: 11 },
});