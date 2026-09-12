// src/services/syncService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';

const QUEUE_KEY = '@offline_scan_queue';

async function getQueue() {
  const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
  return existingQueue ? JSON.parse(existingQueue) : [];
}

async function setQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function removeFromQueue(scanId) {
  const queue = await getQueue();
  const updated = queue.filter((s) => s.id !== scanId);
  await setQueue(updated);
}

export const saveScanOffline = async (tempImageUri, diagnosisResult) => {
  try {
    const filename = tempImageUri.split('/').pop();
    const permanentUri = FileSystem.documentDirectory + filename;
    await FileSystem.copyAsync({ from: tempImageUri, to: permanentUri });

    const scanData = {
      id: Date.now().toString(),
      imageUri: permanentUri,
      diagnosisResult: diagnosisResult,
      timestamp: new Date().toISOString(),
    };

    const queue = await getQueue();
    queue.push(scanData);
    await setQueue(queue);

    syncOfflineScans();
  } catch (error) {
    console.error("Error saving offline scan:", error);
  }
};

export const getPendingScanCount = async () => {
  const queue = await getQueue();
  return queue.length;
};

export const syncOfflineScans = async (options = {}) => {
  const { requireAuth = true } = options;
  
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { attempted: false, synced: 0, failed: 0, errors: [], reason: 'offline' };
  }

  const queue = await getQueue();
  if (queue.length === 0) {
    return { attempted: true, synced: 0, failed: 0, errors: [], reason: 'empty_queue' };
  }

  const { user, reason: authReason } = await getValidUserSession(requireAuth);
  if (!user) {
    return { attempted: false, synced: 0, failed: 0, errors: [], reason: authReason || 'no_session' };
  }

  let synced = 0;
  const errors = [];

  for (const scan of queue) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(scan.imageUri);
      if (!fileInfo.exists) {
        console.warn(`Scan ${scan.id}: local image missing, dropping from queue.`);
        await removeFromQueue(scan.id);
        errors.push({ id: scan.id, reason: 'Local image file no longer exists.' });
        continue;
      }

      const base64 = await FileSystem.readAsStringAsync(scan.imageUri, {
        encoding: 'base64',
      });
      const arrayBuffer = decode(base64);

      const filename = `agrilens_scan_${scan.id}.jpg`;

      const { error: storageError } = await supabase.storage
        .from('scans')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('scans')
        .getPublicUrl(filename);

      const publicUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('scan_results')
        .insert([{
          image_url: publicUrl,
          status: 'Pending AI Analysis',
          farmer_id: user.id,
          disease_id: scan.diagnosisResult?.diseaseId ?? null,
          damage_percent: scan.diagnosisResult?.damagePercent ?? null,
          severity: scan.diagnosisResult?.severity ?? null,
        }]);

      if (dbError) throw dbError;

      await FileSystem.deleteAsync(scan.imageUri, { idempotent: true });
      await removeFromQueue(scan.id);

      synced++;
      console.log(`Successfully synced offline scan: ${scan.id}`);
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`Failed to sync scan ${scan.id}:`, message);
      
      if (message.includes('row-level security') || message.includes('No active session')) {
        console.warn(`Purging unrecoverable phantom scan ${scan.id} due to security constraints.`);
        await FileSystem.deleteAsync(scan.imageUri, { idempotent: true }).catch(() => {});
        await removeFromQueue(scan.id);
        errors.push({ id: scan.id, reason: 'Dropped due to RLS/Auth violation.' });
      } else {
        errors.push({ id: scan.id, reason: message });
      }
    }
  }

  return {
    attempted: true,
    synced,
    failed: errors.length,
    errors,
  };
};