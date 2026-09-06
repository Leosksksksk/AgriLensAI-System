// src/utils/reminderStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'agrilens_reminders';

/**
 * In-app reminder system. Since Expo Go (SDK 53+) blocks expo-notifications
 * entirely, this stores reminders locally and surfaces them as an in-app
 * banner once their due date arrives — no OS push notification, but a
 * genuinely functional, persisted reminder the farmer will see on next open.
 */

export async function getAllReminders() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Could not read reminders:', e);
    return [];
  }
}

export async function addReminder({ diseaseId, diseaseName, cropLabel, daysAhead = 3 }) {
  const reminders = await getAllReminders();

  const id = `${diseaseId}_${cropLabel}_${Date.now()}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysAhead);

  const newReminder = {
    id,
    diseaseId,
    diseaseName,
    cropLabel,
    dueDateISO: dueDate.toISOString(),
    dismissed: false,
  };

  reminders.push(newReminder);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  return newReminder;
}

export async function hasActiveReminder(diseaseId, cropLabel) {
  const reminders = await getAllReminders();
  return reminders.some(
    (r) => r.diseaseId === diseaseId && r.cropLabel === cropLabel && !r.dismissed
  );
}

export async function getDueReminders() {
  const reminders = await getAllReminders();
  const now = new Date();
  return reminders.filter((r) => !r.dismissed && new Date(r.dueDateISO) <= now);
}

export async function dismissReminder(id) {
  const reminders = await getAllReminders();
  const updated = reminders.map((r) => (r.id === id ? { ...r, dismissed: true } : r));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}