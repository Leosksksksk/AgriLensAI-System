// src/screens/AlertsScreen.js
import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { buildAlertsFeed } from '../services/alertsService';
import { fetchWeatherRisk, getCurrentLocation } from '../services/weatherService';

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

function formatReminderDate(value, language, t) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return t('reminderDateUnavailable');
  }
  const locale = language === 'fil' ? 'fil-PH' : language === 'ceb' ? 'fil-PH' : 'en-US';
  return new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatReporterCrops(cropTypes, t) {
  if (!Array.isArray(cropTypes) || cropTypes.length === 0) return null;
  const cropKeys = {
    corn: 'cropCorn',
    pepper: 'cropPepper',
    tomato: 'cropTomato',
    potato: 'cropPotato',
  };
  return cropTypes.map((crop) => cropKeys[String(crop).toLowerCase()]
    ? t(cropKeys[String(crop).toLowerCase()])
    : crop).join(', ');
}

function getAlertStyle(alertType, colors, riskColor, severityColor) {
  switch (alertType) {
    case 'HIGH_RISK':
      return {
        stripColor: colors.leafGreen,
        badgeBg: colors.okBg,
        textColor: colors.ok,
        badgeLabelKey: 'high',
      };
    case 'WARNING':
      return {
        stripColor: severityColor('moderate'),
        badgeBg: severityColor('moderate') + '38',
        textColor: severityColor('moderate'),
        badgeLabelKey: 'medium',
      };
    case 'INFO':
      return {
        stripColor: colors.info,
        badgeBg: colors.infoBg,
        textColor: colors.info,
        badgeLabelKey: 'low',
      };
    case 'REMINDER':
      return {
        stripColor: colors.ok,
        badgeBg: colors.okBg,
        textColor: colors.ok,
        badgeLabelKey: 'info',
      };
    default:
      return {
        stripColor: colors.info,
        badgeBg: colors.infoBg,
        textColor: colors.info,
        badgeLabelKey: 'info',
      };
  }
}

function getEmptyStateIconColor(colors, isDark) {
  return isDark ? colors.textMuted : '#527258';
}

export default function AlertsScreen() {
  const { t, language } = useLanguage();
  const { colors, riskColor, severityColor, isDark } = useTheme();

  const [alerts, setAlerts] = useState([]);
  const [weatherData, setWeatherData] = useState({
    conditionKey: 'weatherLoading',
    temp: '--',
    humidity: '--',
    windSpeed: '--',
    locationName: '',
    locationSource: '',
    locationAccuracy: null,
    checkedAt: '',
  });

  const [locationCoords, setLocationCoords] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReminderId, setExpandedReminderId] = useState(null);
  const [selectedWarningAlert, setSelectedWarningAlert] = useState(null);

  const loadData = useCallback(async () => {
    const weatherPromise = getCurrentLocation().then((location) => fetchWeatherRisk(location));
    const feedWithSharedWeatherPromise = buildAlertsFeed({ weatherPromise })
      .then((feed) => {
        const alertItems = Array.isArray(feed) ? feed : (feed?.alerts || []);
        setAlerts(alertItems);
        setLastUpdated(new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        }));
      })
      .catch((error) => console.warn('Load alerts error:', error))
      .finally(() => setLoading(false));

    const weatherDisplayPromise = weatherPromise
      .then((weather) => {
        setLocationCoords({ latitude: weather.latitude, longitude: weather.longitude });
        setWeatherData({
          conditionKey: weather.conditionKey,
          temp: !weather.isOffline && typeof weather.temperature === 'number' ? weather.temperature.toFixed(1) : '--',
          humidity: !weather.isOffline && typeof weather.humidity === 'number' ? String(weather.humidity) : '--',
          windSpeed: !weather.isOffline && typeof weather.windSpeedKmh === 'number' ? weather.windSpeedKmh.toFixed(1) : '--',
          locationName: weather.locationName,
          locationSource: weather.locationSource,
          locationAccuracy: weather.accuracy,
          checkedAt: weather.checkedAt,
          isOffline: weather.isOffline,
        });
      })
      .catch((error) => console.warn('Load live weather error:', error));

    await Promise.all([feedWithSharedWeatherPromise, weatherDisplayPromise]);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const accentColor = useMemo(() => riskColor('high risk'), [riskColor, isDark]);

  const generateLeafletHTML = useCallback(() => {
    if (!locationCoords) return '';

    const markersJS = alerts
      .filter((alert) => alert.isHotspot && Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude))
      .map((alert) => {
      const markerLat = alert.latitude;
      const markerLon = alert.longitude;

      const titleTemplate = alert.titleKey ? t(alert.titleKey) : alert.title;
      const title = interpolate(titleTemplate, alert.titleValues || alert.descValues, t) || alert.title;

      const style = getAlertStyle(alert.type, colors, riskColor, severityColor);

      return `
        L.marker([${markerLat}, ${markerLon}]).addTo(map)
            .bindPopup("<b>${title}</b><br><span style='color:${style.textColor};'>${alert.riskLevel || t('activeHotspot')}</span>");
      `;
          }).join('\n');

    const mapBgColor = isDark ? '#112516' : '#E8F5E9';
    const userMarkerColor = accentColor;
    const tileFilter = isDark
      ? 'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)'
      : 'none';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${mapBgColor}; }
          .leaflet-tile { filter: ${tileFilter}; }
          .leaflet-container { background: ${mapBgColor} !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${locationCoords.latitude}, ${locationCoords.longitude}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);

          L.circle([${locationCoords.latitude}, ${locationCoords.longitude}], {
            color: '${userMarkerColor}',
            fillColor: '${userMarkerColor}',
            fillOpacity: 0.3,
            radius: 300
          }).addTo(map);

          ${markersJS}
        </script>
      </body>
      </html>
    `;
  }, [alerts, locationCoords, colors, riskColor, severityColor, isDark, t, accentColor]);

  const emptyIconColor = getEmptyStateIconColor(colors, isDark);
  const primaryAccent = isDark ? '#4CD964' : colors.primary;
  const hotspotCount = alerts.filter((alert) => alert.isHotspot).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('climateRisk')}</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={primaryAccent} />
          ) : (
            <Ionicons name="refresh-outline" size={22} color={primaryAccent} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryAccent}
          />
        }
      >
        {/* Weather Card */}
        <View style={[styles.weatherCard, { backgroundColor: accentColor }]}>
          <Text style={[styles.conditionText, { color: '#E0F2E3' }]}>{t(weatherData.conditionKey)}</Text>
          {!!weatherData.locationName && (
            <Text style={[styles.weatherMeta, { color: '#E0F2E3' }]}>
              {weatherData.locationName}
              {` · ${weatherData.locationSource}`}
              {weatherData.locationSource === 'GPS' && weatherData.locationAccuracy != null
                ? ` ±${Math.round(weatherData.locationAccuracy)} m`
                : ''}
              {weatherData.checkedAt
                ? ` · ${t('weatherCheckedAt').replace('{time}', weatherData.checkedAt)}`
                : ''}
            </Text>
          )}
          <Text style={[styles.tempText, { color: '#FFFFFF' }]}>{weatherData.temp}°C</Text>

          <View style={styles.metricsRow}>
            {/* Humidity */}
            <View style={styles.metricItem}>
              <Ionicons name="water-outline" size={24} color={colors.white} />
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>{weatherData.humidity}%</Text>
              <Text style={[styles.metricLabel, { color: '#E0F2E3' }]}>{t('humidity')}</Text>
            </View>

            {/* Divider */}
            <View style={[styles.metricDivider, { backgroundColor: 'rgba(255, 255, 255, 0.35)' }]} />

            {/* Wind */}
            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={24} color={colors.white} style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>{weatherData.windSpeed}</Text>
              <Text style={[styles.metricLabel, { color: '#E0F2E3' }]}>{t('windKm')}</Text>
            </View>
          </View>
        </View>

        {/* Interactive Outbreak & Risk Map Section */}
        <View style={styles.mapCardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('outbreakMap')}</Text>
          <Text style={[styles.mapBadgeText, { color: primaryAccent }]}>{hotspotCount} {t('activeHotspots')}</Text>
        </View>

        <View style={[styles.mapContainer, { backgroundColor: isDark ? '#112516' : '#E8F5E9', borderColor: colors.border }]}>
          <WebView
            originWhitelist={['*']}
            source={{ html: generateLeafletHTML() }}
            style={styles.map}
            scrollEnabled={false}
          />
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('diseaseRiskForecast')}</Text>

        {/* Forecast Alert Cards */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ActivityIndicator size="small" color={accentColor} />
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={emptyIconColor} />
            <Text style={[styles.emptyTitle, { color: isDark ? colors.white : colors.textDark }]}>{t('noAlertsTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{t('noAlertsDesc')}</Text>
          </View>
        ) : (
          alerts.map((alert, idx) => {
            const style = getAlertStyle(alert.type, colors, riskColor, severityColor);

            const titleTemplate = alert.titleKey ? t(alert.titleKey) : alert.title;
            const title = interpolate(titleTemplate, alert.titleValues || alert.descValues, t) || alert.title;

            const descTemplate = alert.descKey ? t(alert.descKey) : alert.description;
            const desc = interpolate(descTemplate, alert.descValues, t) || alert.description;

            const badgeText = alert.tagKey
              ? t(alert.tagKey)
              : (alert.riskLevel || t(style.badgeLabelKey));
            const reporters = Array.isArray(alert.reporters) ? alert.reporters.slice(0, 3) : [];
            const remainingReporterCount = Math.max(0, (alert.reporterCount || 0) - reporters.length);
            const isReminder = alert.type === 'REMINDER';
            const isWarning = alert.type === 'WARNING';
            const isReminderExpanded = expandedReminderId === alert.id;
            const isClickable = isReminder || isWarning;
            const AlertCard = isClickable ? TouchableOpacity : View;

            return (
              <AlertCard
                key={alert.id || idx.toString()}
                style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                {...(isClickable ? {
                  activeOpacity: 0.85,
                  onPress: isReminder
                    ? () => setExpandedReminderId(isReminderExpanded ? null : alert.id)
                    : () => setSelectedWarningAlert(alert),
                  accessibilityRole: 'button',
                  ...(isReminder ? { accessibilityState: { expanded: isReminderExpanded } } : {}),
                } : {})}
              >
                <View style={[styles.accentStrip, { backgroundColor: style.stripColor }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.alertTitle, { color: colors.textDark }]}>{title}</Text>
                    <View style={[styles.badge, { backgroundColor: style.badgeBg }]}>
                      <Text numberOfLines={1} style={[styles.badgeText, { color: style.textColor }]}>
                        {badgeText}
                      </Text>
                    </View>
                    {isReminder && (
                      <Ionicons
                        name={isReminderExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                        style={styles.reminderChevron}
                      />
                    )}
                    {isWarning && (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.reminderChevron} />
                    )}
                  </View>
                  <Text style={[styles.alertDescription, { color: colors.textMuted }]}>{desc}</Text>
                  {isReminderExpanded && (
                    <View style={[styles.reminderDates, { borderTopColor: colors.border }]}>
                      <Text style={[styles.reminderDateText, { color: colors.textMuted }]}>
                        {t('reminderAddedDate').replace('{date}', formatReminderDate(alert.createdAtISO, language, t))}
                      </Text>
                      <Text style={[styles.reminderDateText, { color: colors.textMuted }]}>
                        {t('reminderDueDate').replace('{date}', formatReminderDate(alert.dueDateISO, language, t))}
                      </Text>
                    </View>
                  )}
                  {reporters.length > 0 && (
                    <View style={styles.reportersSection}>
                      <Text style={[styles.reportersHeading, { color: colors.textLight }]}>{t('reportedBy')}</Text>
                      {reporters.map((reporter, reporterIndex) => (
                        <View key={reporter.id || `${alert.id}-reporter-${reporterIndex}`} style={styles.reporterRow}>
                          <View style={[styles.reporterAvatar, { backgroundColor: colors.primaryDark }]}>
                            {reporter.profile_image_url ? (
                              <Image source={{ uri: reporter.profile_image_url }} style={styles.reporterAvatarImage} />
                            ) : (
                              <Ionicons name="person" size={17} color={colors.white} />
                            )}
                          </View>
                          <View style={styles.reporterDetails}>
                            <Text numberOfLines={1} style={[styles.reporterName, { color: colors.textDark }]}>
                              {reporter.full_name || t('farmer')}
                            </Text>
                            <Text numberOfLines={1} style={[styles.reporterBarangay, { color: colors.textMuted }]}>
                              {reporter.barangay || t('unknownBarangay')}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {remainingReporterCount > 0 && (
                        <Text style={[styles.moreReporters, { color: colors.textMuted }]}>
                          {t('moreReporters').replace('{count}', String(remainingReporterCount))}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </AlertCard>
            );
          })
        )}

        {/* Timestamp */}
        {lastUpdated ? <Text style={[styles.timestamp, { color: colors.textLight }]}>{t('updatedAt').replace('{time}', lastUpdated)}</Text> : null}

      </ScrollView>

      <Modal
        visible={!!selectedWarningAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWarningAlert(null)}
      >
        <Pressable style={styles.profileModalOverlay} onPress={() => setSelectedWarningAlert(null)}>
          <Pressable style={[styles.profileModal, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={styles.profileModalHeader}>
              <Text style={[styles.profileModalTitle, { color: colors.textDark }]}>{t('reporterProfiles')}</Text>
              <TouchableOpacity onPress={() => setSelectedWarningAlert(null)} accessibilityRole="button" accessibilityLabel={t('close')}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.profileList}>
              {(selectedWarningAlert?.reporters || []).map((reporter, index) => {
                const crops = formatReporterCrops(reporter.crop_types, t);
                return (
                  <View key={reporter.id || index} style={[styles.profileItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: colors.primaryDark }]}>
                      {reporter.profile_image_url ? (
                        <Image source={{ uri: reporter.profile_image_url }} style={styles.profileAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={30} color={colors.white} />
                      )}
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileName, { color: colors.textDark }]}>
                        {reporter.full_name || t('farmer')}
                      </Text>
                      <Text style={[styles.profileField, { color: colors.textMuted }]}>
                        {t('barangay')}: {reporter.barangay || t('unknownBarangay')}
                      </Text>
                      {!!reporter.farm_size && (
                        <Text style={[styles.profileField, { color: colors.textMuted }]}>
                          {t('farmSize')}: {reporter.farm_size}
                        </Text>
                      )}
                      {!!crops && (
                        <Text style={[styles.profileField, { color: colors.textMuted }]}>
                          {t('cropTypes')}: {crops}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
              {(!selectedWarningAlert?.reporters || selectedWarningAlert.reporters.length === 0) && (
                <Text style={[styles.noReporterInfo, { color: colors.textMuted }]}>{t('reporterInfoUnavailable')}</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  weatherCard: { borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', marginBottom: 28, marginTop: 8 },
  conditionText: { color: '#E0F2E3', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  weatherMeta: { color: '#E0F2E3', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  tempText: { color: '#FFFFFF', fontSize: 50, fontWeight: '800', marginBottom: 18 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', paddingTop: 4 },
  metricItem: { alignItems: 'center', flex: 1 },
  metricValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 6 },
  metricLabel: { color: '#E0F2E3', fontSize: 14, marginTop: 2 },
  metricDivider: { width: 1, height: 38 },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mapBadgeText: { color: '#4CD964', fontSize: 14, fontWeight: '700' },
  mapContainer: { height: 200, borderRadius: 18, overflow: 'hidden', marginBottom: 28, borderWidth: 1 },
  map: { width: '100%', height: '100%' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 19, fontWeight: '800' },
  emptyDesc: { fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
  alertCard: { borderRadius: 14, marginBottom: 16, overflow: 'hidden', position: 'relative', borderWidth: 1 },
  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  cardContent: { paddingVertical: 16, paddingHorizontal: 18, paddingLeft: 22 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  alertTitle: { flex: 1, flexShrink: 1, marginRight: 8, fontSize: 19, fontWeight: '700' },
  badge: { flexShrink: 0, maxWidth: '42%', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  alertDescription: { fontSize: 15.5, lineHeight: 22 },
  reminderChevron: { marginLeft: 6 },
  reminderDates: { borderTopWidth: 1, marginTop: 12, paddingTop: 10, gap: 5 },
  reminderDateText: { fontSize: 13, lineHeight: 18 },
  profileModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' },
  profileModal: { width: '100%', maxWidth: 440, maxHeight: '78%', borderRadius: 16, padding: 18 },
  profileModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileModalTitle: { flex: 1, fontSize: 19, fontWeight: '800' },
  profileList: { gap: 12 },
  profileItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderBottomWidth: 1, paddingBottom: 12 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  profileField: { fontSize: 13, lineHeight: 19 },
  noReporterInfo: { paddingVertical: 12, fontSize: 14 },
  reportersSection: { marginTop: 12, gap: 8 },
  reportersHeading: { fontSize: 12, fontWeight: '700' },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reporterAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reporterAvatarImage: { width: '100%', height: '100%' },
  reporterDetails: { flex: 1 },
  reporterName: { fontSize: 14, fontWeight: '700' },
  reporterBarangay: { fontSize: 12, marginTop: 1 },
  moreReporters: { fontSize: 12, fontWeight: '600', marginLeft: 48 },
  timestamp: { textAlign: 'center', fontSize: 14, marginTop: 16, marginBottom: 8 },
});

export { getAlertStyle };