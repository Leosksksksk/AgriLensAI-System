// src/screens/ClimateScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskColor } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { fetchWeatherRisk, fetch7DayForecast } from '../services/weatherService';

export default function ClimateScreen({ location = 'Bogo City Cebu' }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    loadWeather();
  }, []);

  async function loadWeather() {
    setLoading(true);
    try {
      const [current, daily] = await Promise.all([
        fetchWeatherRisk(),
        fetch7DayForecast(),
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('climate')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const currentRisk = weather?.riskLevel || 'Moderate';
  const currentRiskKey = currentRisk.toLowerCase() === 'high' ? 'riskHigh' : currentRisk.toLowerCase() === 'moderate' ? 'riskModerate' : 'riskLow';
  const currentRiskColor = riskColor(currentRisk + ' Risk');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('climate')}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.white} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadWeather} />
      }>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="sunny" size={18} color="#F5A623" />
            <Text style={styles.metricLabel}>{t('temperature')}</Text>
            <Text style={styles.metricValue}>{weather?.temperature ?? 28}°C</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="water" size={18} color="#1565C0" />
            <Text style={styles.metricLabel}>{t('humidity')}</Text>
            <Text style={styles.metricValue}>{weather?.humidity ?? 70}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="rainy" size={18} color="#1E88E5" />
            <Text style={styles.metricLabel}>{t('rainProbability')}</Text>
            <Text style={styles.metricValue}>{weather?.rainProbability ?? 0}%</Text>
          </View>
        </View>

        <View style={[styles.riskCard, { borderLeftColor: currentRiskColor }]}>
          <View style={[styles.riskDot, { backgroundColor: currentRiskColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.riskTitle, { color: currentRiskColor }]}>
              {t(currentRiskKey)}
            </Text>
            <Text style={styles.riskDesc}>
              {currentRisk === 'High' ? t('favorableConditions') : 
               currentRisk === 'Moderate' ? t('moderateConditions') : t('lowConditions')}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.riskLink, { color: currentRiskColor }]}>{t('viewDetails')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('forecast7Day')}</Text>

        {forecast.map((f, i) => (
          <View key={i} style={styles.forecastRow}>
            <View>
              <Text style={styles.forecastDay}>{formatDay(f.date)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <Text style={styles.forecastTemp}>
                  {f.tempMax}° / {f.tempMin}°
                </Text>
                <Ionicons name={f.icon} size={16} color={colors.textMuted} />
              </View>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskColor(f.riskLevel + ' Risk') }]}>
              <Text style={styles.riskBadgeText}>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primaryDark, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  locationText: { color: '#DCEEDC', fontSize: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  body: { padding: 20, paddingBottom: 40 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'flex-start', gap: 6 },
  metricLabel: { fontSize: 11, color: colors.textMuted },
  metricValue: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  riskCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10, marginTop: 4 },
  riskTitle: { fontWeight: '800', fontSize: 13, marginBottom: 4 },
  riskDesc: { fontSize: 13, marginBottom: 6 },
  riskLink: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
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