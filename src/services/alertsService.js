// src/services/alertsService.js
import { fetchWeatherRisk } from './weatherService';
import { fetchNearbyOutbreaks, fetchPendingScanCount } from './outbreakService';
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

export async function buildAlertsFeed() {
  const alerts = [];
  const now = new Date();

  try {
    const weather = await fetchWeatherRisk();
    if (weather.riskLevel === 'High') {
      alerts.push({
        id: 'weather',
        type: 'HIGH_RISK',
        tagKey: 'highRisk',
        time: timeAgo(now),
        titleKey: 'alertHeatTitle',
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
  } catch (e) {
    console.warn('Weather alert error:', e);
  }

  try {
    const outbreaks = await fetchNearbyOutbreaks();
    outbreaks.forEach((o) => {
      const profile = getDiseaseProfile(o.disease_id);
      alerts.push({
        id: `outbreak_${o.disease_id}`,
        type: 'WARNING',
        tagKey: 'tagWarning',
        time: timeAgo(now),
        titleKey: 'alertBlightTitle',
        descKey: 'alertBlightNearbyDesc',
        descValues: { count: o.farm_count, diseaseNameKey: profile.nameKey },
        sortTime: now.getTime() - 1000,
      });
    });
  } catch (e) {
    console.warn('Outbreak alert error:', e);
  }

  try {
    const pendingCount = await fetchPendingScanCount();
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
  } catch (e) {
    console.warn('Pending scan alert error:', e);
  }

  try {
    const reminders = await getDueReminders();
    reminders.forEach((r) => {
      alerts.push({
        id: `reminder_${r.id}`,
        type: 'REMINDER',
        tagKey: 'tagReminder',
        time: timeAgo(r.dueDateISO),
        titleKey: 'alertFungicideTitle',
        descKey: 'alertReminderDesc',
        descValues: { crop: r.cropLabel, disease: r.diseaseName },
        sortTime: new Date(r.dueDateISO).getTime(),
      });
    });
  } catch (e) {
    console.warn('Reminder alert error:', e);
  }

  return alerts.sort((a, b) => b.sortTime - a.sortTime);
}