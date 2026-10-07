// src/screens/ClimateScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchWeatherRisk, fetch7DayForecast, getCurrentLocation } from '../services/weatherService';

export default function ClimateScreen({ location = 'Bogo City Cebu' }) {
  const { t } = useLanguage();
  const { colors, isDark, riskColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    loadWeather();
  }, []);

  async function loadWeather() {
    setLoading(true);
    try {
      const currentLocation = await getCurrentLocation();
      const [current, daily] = await Promise.all([
        fetchWeatherRisk(currentLocation),
        fetch7DayForecast(currentLocation),
      ]);
      setWeather(current);
      setForecast(daily);
    } catch (e) {
      console.warn('ClimateScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }

  function formatDay(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return t('today');
    if (date.getTime() === tomorrow.getTime()) return t('tomorrow');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('climate')}</Text>
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const currentRisk = weather?.riskLevel || 'Moderate';
  const currentRiskKey = currentRisk.toLowerCase() === 'high' ? 'riskHigh' : currentRisk.toLowerCase() === 'moderate' ? 'riskModerate' : 'riskLow';
  const currentRiskColor = riskColor(currentRisk + ' Risk');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('climate')}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.white} />
          <Text style={[styles.locationText, { color: '#DCEEDC' }]}>
            {weather?.locationName || location}
            {weather?.locationSource ? ` · ${weather.locationSource}` : ''}
            {weather?.locationSource === 'GPS' && weather.accuracy != null
              ? ` ±${Math.round(weather.accuracy)} m`
              : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadWeather} />
      }>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
            <Ionicons name="sunny" size={20} color="#F5A623" />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('temperature')}</Text>
            <Text style={[styles.metricValue, { color: colors.textDark }]}>{weather?.temperature ?? 28}°C</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
            <Ionicons name="water" size={20} color="#1565C0" />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('humidity')}</Text>
            <Text style={[styles.metricValue, { color: colors.textDark }]}>{weather?.humidity ?? 70}%</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
            <Ionicons name="rainy" size={20} color="#1E88E5" />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('rainProbability')}</Text>
            <Text style={[styles.metricValue, { color: colors.textDark }]}>{weather?.rainProbability ?? 0}%</Text>
          </View>
        </View>

        <View style={[styles.riskCard, { backgroundColor: colors.dangerBg, borderLeftColor: currentRiskColor }]}>
          <View style={[styles.riskDot, { backgroundColor: currentRiskColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.riskTitle, { color: currentRiskColor }]}>
              {t(currentRiskKey)}
            </Text>
            <Text style={[styles.riskDesc, { color: colors.textDark }]}>
              {currentRisk === 'High' ? t('favorableConditions') : 
               currentRisk === 'Moderate' ? t('moderateConditions') : t('lowConditions')}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.riskLink, { color: currentRiskColor }]}>{t('viewDetails')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('forecast7Day')}</Text>

        {forecast.map((f, i) => (
          <View key={i} style={[styles.forecastRow, { backgroundColor: colors.warningBg }]}>
            <View>
              <Text style={[styles.forecastDay, { color: colors.textDark }]}>{formatDay(f.date)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <Text style={[styles.forecastTemp, { color: colors.textMuted }]}>
                  {f.tempMax}° / {f.tempMin}°
                </Text>
                <Ionicons name={f.icon} size={18} color={colors.textMuted} />
              </View>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskColor(f.riskLevel + ' Risk') }]}>
              <Text style={[styles.riskBadgeText, { color: colors.white }]}>
                {t(f.riskLevel.toLowerCase() === 'high' ? 'riskHigh' : f.riskLevel.toLowerCase() === 'moderate' ? 'riskModerate' : 'riskLow')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: 'transparent', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  locationText: { fontSize: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  body: { padding: 20, paddingBottom: 40 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'flex-start', gap: 6 },
  metricLabel: { fontSize: 13 },
  metricValue: { fontSize: 18, fontWeight: '800' },
  riskCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10, marginTop: 4 },
  riskTitle: { fontWeight: '800', fontSize: 15, marginBottom: 4 },
  riskDesc: { fontSize: 15, marginBottom: 6 },
  riskLink: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  sectionTitle: { fontWeight: '800', fontSize: 18, marginBottom: 12 },
  forecastRow: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastDay: { fontWeight: '700', fontSize: 16 },
  forecastTemp: { fontSize: 15 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  riskBadgeText: { fontWeight: '700', fontSize: 13 },
});