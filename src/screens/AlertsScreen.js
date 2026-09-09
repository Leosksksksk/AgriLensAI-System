// src/screens/AlertsScreen.js
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { buildAlertsFeed } from '../services/alertsService';

// 🔑 Confirmed OpenWeatherMap API Key
const OPENWEATHER_API_KEY = 'f62d5ddae8ba892c756cbec5931b2feb';

const ALERT_TYPE_STYLES = {
  HIGH_RISK: {
    stripColor: '#E67E22',
    badgeBg: 'rgba(230, 126, 34, 0.22)',
    textColor: '#E67E22',
    badgeLabelKey: 'high',
    pinColor: '#E67E22',
  },
  WARNING: {
    stripColor: '#F1C40F',
    badgeBg: 'rgba(241, 196, 15, 0.22)',
    textColor: '#F1C40F',
    badgeLabelKey: 'medium',
    pinColor: '#F1C40F',
  },
  INFO: {
    stripColor: '#2ECC71',
    badgeBg: 'rgba(46, 204, 113, 0.22)',
    textColor: '#2ECC71',
    badgeLabelKey: 'low',
    pinColor: '#2ECC71',
  },
  REMINDER: {
    stripColor: '#2ECC71',
    badgeBg: 'rgba(46, 204, 113, 0.22)',
    textColor: '#2ECC71',
    badgeLabelKey: 'info',
    pinColor: '#2ECC71',
  },
};

// Dark map silver/dark theme style array
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a361a' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b687a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1710' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c4a2e' }] },
];

function interpolate(template, values, t) {
  if (!template) return '';
  let result = template;
  Object.entries(values || {}).forEach(([key, value]) => {
    const isKeyRef = key.endsWith('NameKey');
    const resolved = isKeyRef ? t(value) : value;
    const placeholder = isKeyRef ? key.replace('NameKey', '') : key;
    result = result.split(`{${placeholder}}`).join(resolved);
  });
  return result;
}

export default function AlertsScreen() {
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState([]);
  const [weatherData, setWeatherData] = useState({
    condition: 'Loading...',
    temp: '--',
    humidity: '--',
    windSpeed: '--',
  });
  
  // Default Map Coordinates (Fallback: Bogo City, Cebu)
  const [region, setRegion] = useState({
    latitude: 11.0514,
    longitude: 124.0055,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Live Weather & Coordinates from OpenWeatherMap
  const fetchLiveWeather = async () => {
    let lat = null;
    let lon = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = location.coords.latitude;
        lon = location.coords.longitude;

        setRegion((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));
      }
    } catch (e) {
      console.warn('GPS location permission or retrieval failed:', e);
    }

    try {
      let url = '';

      if (lat !== null && lon !== null) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      } else {
        const savedBarangay = await AsyncStorage.getItem('userBarangay');
        const searchLocation = savedBarangay ? `${savedBarangay}, PH` : 'Bogo City, PH';
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(searchLocation)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.main) {
        if (data.coord) {
          setRegion((prev) => ({
            ...prev,
            latitude: data.coord.lat,
            longitude: data.coord.lon,
          }));
        }

        return {
          condition: data.weather[0]?.main || 'Clear',
          temp: data.main.temp.toFixed(1),
          humidity: data.main.humidity.toString(),
          windSpeed: (data.wind.speed * 3.6).toFixed(1),
        };
      }
    } catch (error) {
      console.warn('Failed to fetch OpenWeatherMap data:', error);
    }
    return null;
  };

  const loadData = useCallback(async () => {
    try {
      const [feed, liveWeather] = await Promise.all([
        buildAlertsFeed().catch((err) => {
          console.warn('buildAlertsFeed offline error:', err);
          return null;
        }),
        fetchLiveWeather(),
      ]);

      if (liveWeather) {
        setWeatherData(liveWeather);
      } else if (feed?.weather) {
        setWeatherData(feed.weather);
      }

      const alertItems = Array.isArray(feed) ? feed : (feed?.alerts || []);
      setAlerts(alertItems);

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.warn('Alerts feed / Weather fetch error:', error);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('climateRisk') || t('alerts') || 'Climate Risk'}</Text>
        <TouchableOpacity 
          style={styles.refreshBtn} 
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#4CD964" />
          ) : (
            <Ionicons name="refresh-outline" size={20} color="#4CD964" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary || '#4CD964'} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              tintColor="#4CD964"
            />
          }
        >
          {/* Weather Card */}
          <View style={styles.weatherCard}>
            <Text style={styles.conditionText}>{weatherData.condition}</Text>
            <Text style={styles.tempText}>{weatherData.temp}°C</Text>

            <View style={styles.metricsRow}>
              {/* Humidity */}
              <View style={styles.metricItem}>
                <Ionicons name="water-outline" size={22} color="#FFFFFF" />
                <Text style={styles.metricValue}>{weatherData.humidity}%</Text>
                <Text style={styles.metricLabel}>{t('humidity') || 'Humidity'}</Text>
              </View>

              {/* Divider */}
              <View style={styles.metricDivider} />

              {/* Wind */}
              <View style={styles.metricItem}>
                <Ionicons name="navigate-outline" size={22} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                <Text style={styles.metricValue}>{weatherData.windSpeed}</Text>
                <Text style={styles.metricLabel}>{t('windKm') || 'Wind km/h'}</Text>
              </View>
            </View>
          </View>

          {/* 🎯 Interactive Disease Risk Map Section */}
          <View style={styles.mapCardHeader}>
            <Text style={styles.sectionTitle}>Outbreak & Risk Map</Text>
            <Text style={styles.mapBadgeText}>{alerts.length} Active Hotspots</Text>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              region={region}
              customMapStyle={DARK_MAP_STYLE}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {/* Map Hotspot Pins for Alerts */}
              {alerts.map((alert, index) => {
                const style = ALERT_TYPE_STYLES[alert.type] || ALERT_TYPE_STYLES.INFO;
                // Offset pins slightly around user center for visualization
                const latOffset = (index === 0 ? 0.008 : index === 1 ? -0.012 : 0.015);
                const lonOffset = (index === 0 ? 0.012 : index === 1 ? -0.008 : -0.015);

                const markerLat = region.latitude + latOffset;
                const markerLon = region.longitude + lonOffset;

                const titleTemplate = alert.titleKey ? t(alert.titleKey) : alert.title;
                const title = interpolate(titleTemplate, alert.titleValues || alert.descValues, t) || alert.title;

                return (
                  <Marker
                    key={alert.id || index}
                    coordinate={{ latitude: markerLat, longitude: markerLon }}
                    pinColor={style.pinColor}
                  >
                    <Callout style={styles.calloutContainer}>
                      <View style={styles.calloutView}>
                        <Text style={styles.calloutTitle}>{title}</Text>
                        <Text style={styles.calloutSub}>
                          {alert.riskLevel || 'Active Alert'}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          </View>

          {/* Section Title */}
          <Text style={styles.sectionTitle}>{t('diseaseRiskForecast') || 'Disease Risk Forecast'}</Text>

          {/* Forecast Alert Cards */}
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted || '#527258'} />
              <Text style={styles.emptyTitle}>{t('noAlertsTitle') || 'No Active Alerts'}</Text>
              <Text style={styles.emptyDesc}>{t('noAlertsDesc') || 'Your crops are currently in low-risk climate conditions.'}</Text>
            </View>
          ) : (
            alerts.map((alert) => {
              const style = ALERT_TYPE_STYLES[alert.type] || ALERT_TYPE_STYLES.INFO;

              const titleTemplate = alert.titleKey ? t(alert.titleKey) : alert.title;
              const title = interpolate(titleTemplate, alert.titleValues || alert.descValues, t) || alert.title;

              const descTemplate = alert.descKey ? t(alert.descKey) : alert.description;
              const desc = interpolate(descTemplate, alert.descValues, t) || alert.description;

              const badgeText = alert.tagKey 
                ? t(alert.tagKey) 
                : (alert.riskLevel || t(style.badgeLabelKey) || 'Info');

              return (
                <View key={alert.id || alert.title} style={styles.alertCard}>
                  <View style={[styles.accentStrip, { backgroundColor: style.stripColor }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.alertTitle}>{title}</Text>
                      <View style={[styles.badge, { backgroundColor: style.badgeBg }]}>
                        <Text style={[styles.badgeText, { color: style.textColor }]}>
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertDescription}>{desc}</Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Timestamp */}
          {lastUpdated ? <Text style={styles.timestamp}>Updated: {lastUpdated}</Text> : null}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A1C10' 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 12 
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    letterSpacing: 0.3 
  },
  refreshBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centerFill: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  body: { 
    paddingHorizontal: 20, 
    paddingBottom: 32 
  },
  weatherCard: {
    backgroundColor: '#4E9E5B',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  conditionText: {
    color: '#E0F2E3',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  tempText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  metricLabel: {
    color: '#E0F2E3',
    fontSize: 12,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapBadgeText: {
    color: '#4CD964',
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  calloutContainer: {
    padding: 6,
    minWidth: 120,
  },
  calloutView: {
    alignItems: 'center',
  },
  calloutTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: '#112516',
  },
  calloutSub: {
    fontSize: 11,
    color: '#E67E22',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40, 
    gap: 10 
  },
  emptyTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },
  emptyDesc: { 
    fontSize: 13, 
    color: '#8BA992', 
    textAlign: 'center', 
    paddingHorizontal: 20 
  },
  alertCard: {
    backgroundColor: '#112516',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardContent: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingLeft: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertDescription: {
    fontSize: 13.5,
    color: '#8BA992',
    lineHeight: 20,
  },
  timestamp: {
    textAlign: 'center',
    color: '#527258',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
  },
});