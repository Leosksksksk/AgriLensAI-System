// src/services/alertsService.js
import { fetchWeatherRisk } from './weatherService';
import { fetchNearbyOutbreaks, fetchPendingOfflineScanCount } from './outbreakService';
import { getDueReminders } from '../utils/reminderStorage';
import { getDiseaseProfile } from '../utils/diseaseCatalog';

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getWeatherAlertTitle(weather) {
  const { temperature, humidity, rainProbability, windSpeedKmh } = weather;
  
  // Determine primary risk driver
  const isHot = temperature >= 30;
  const isHumid = humidity >= 80;
  const isRainy = rainProbability >= 50;
  const isWindy = windSpeedKmh >= 15;
  
  if (isHot && (isHumid || isRainy)) return 'alertHeatHumidityTitle';
  if (isHot) return 'alertHeatTitle';
  if (isHumid && isRainy) return 'alertHumidityRainTitle';
  if (isHumid) return 'alertHumidityTitle';
  if (isRainy) return 'alertRainTitle';
  if (isWindy) return 'alertWindTitle';
  
  return 'alertHighRiskTitle';
}

export async function buildAlertsFeed({ weatherPromise = fetchWeatherRisk() } = {}) {
  const alerts = [];
  const now = new Date();

  const [weather, outbreaks, pendingCount, reminders] = await Promise.all([
    weatherPromise.catch((e) => {
      console.warn('Weather alert error:', e);
      return null;
    }),
    fetchNearbyOutbreaks().catch((e) => {
      console.warn('Outbreak alert error:', e);
      return [];
    }),
    fetchPendingOfflineScanCount().catch((e) => {
      console.warn('Pending scan alert error:', e);
      return 0;
    }),
    getDueReminders().catch((e) => {
      console.warn('Reminder alert error:', e);
      return [];
    }),
  ]);

  if (weather?.riskLevel === 'High') {
    const titleKey = getWeatherAlertTitle(weather);
    alerts.push({
      id: 'weather',
      type: 'HIGH_RISK',
      tagKey: 'highRisk',
      time: timeAgo(now),
      titleKey,
      descKey: 'alertWeatherRiskDesc',
      descValues: {
        temp: Math.round(weather.temperature),
        humidity: Math.round(weather.humidity),
        rain: Math.round(weather.rainProbability),
        wind: Math.round(weather.windSpeedKmh),
      },
      sortTime: now.getTime(),
    });
  }

  outbreaks.forEach((o) => {
    const profile = getDiseaseProfile(o.disease_id);
    alerts.push({
      id: `outbreak_${o.disease_id}`,
      type: 'WARNING',
      isHotspot: true,
      latitude: Number(o.latitude ?? o.lat),
      longitude: Number(o.longitude ?? o.lng),
      tagKey: 'tagWarning',
      time: timeAgo(now),
      titleKey: 'alertNearbyDiseaseTitle',
      titleValues: { diseaseNameKey: profile.nameKey },
      descKey: 'alertBlightNearbyDesc',
      descValues: { count: o.farm_count, diseaseNameKey: profile.nameKey },
      reporters: Array.isArray(o.reporters) ? o.reporters : [],
      reporterCount: Number(o.farm_count) || 0,
      sortTime: now.getTime() - 1000,
    });
  });

  if (pendingCount > 0) {
    alerts.push({
      id: 'pending',
      type: 'INFO',
      tagKey: 'tagInfo',
      time: timeAgo(now),
      titleKey: 'alertPendingTitle',
      descKey: 'alertPendingDescDynamic',
      descValues: { count: pendingCount },
      sortTime: now.getTime() - 2000,
    });
  }

  reminders.forEach((r) => {
    const diseaseProfile = r.diseaseId ? getDiseaseProfile(r.diseaseId) : null;
    alerts.push({
      id: `reminder_${r.id}`,
      type: 'REMINDER',
      tagKey: 'tagReminder',
      time: timeAgo(r.dueDateISO),
      titleKey: 'alertReminderTitle',
      descKey: 'alertReminderDesc',
      descValues: {
        crop: r.cropLabel || r.crop || '',
        ...(diseaseProfile
          ? { diseaseNameKey: diseaseProfile.nameKey }
          : { disease: r.diseaseName || '' }),
      },
      createdAtISO: r.createdAtISO || r.id?.match(/_(\d{13})$/)?.[1]
        ? (r.createdAtISO || new Date(Number(r.id.match(/_(\d{13})$/)[1])).toISOString())
        : null,
      dueDateISO: r.dueDateISO || null,
      sortTime: new Date(r.dueDateISO).getTime(),
    });
  });

  return alerts.sort((a, b) => b.sortTime - a.sortTime);
}