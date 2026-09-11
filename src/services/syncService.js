// src/services/syncService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../supabaseClient';

const QUEUE_KEY = '@offline_scan_queue';

async function getQueue() {
  const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
  return existingQueue ? JSON.parse(existingQueue) : [];
}

async function setQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Removes a single scan (by id) from the persisted queue. Writing after
// EVERY outcome — not just once at the end of the whole sync run — is
// what prevents a mid-sync app reload/crash from leaving the queue out
// of sync with what's actually been uploaded/deleted.
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

/**
 * Syncs every queued offline scan to Supabase. Returns a summary object
 * instead of throwing, so the caller (SyncScreen) can show the user
 * exactly what happened even when some items fail.
 */
export const syncOfflineScans = async () => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { attempted: false, synced: 0, failed: 0, errors: [] };
  }

  const queue = await getQueue();
  if (queue.length === 0) {
    return { attempted: true, synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  const errors = [];

  for (const scan of queue) {
    try {
      // If the local image file is missing (e.g. a previous sync deleted
      // it but got interrupted before removing the queue entry), this
      // scan can never succeed — drop it instead of retrying forever.
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

      // Moved auth check UP to ensure user session exists before processing storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session. User must be logged in.');

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

      // Delete the local file, THEN remove from queue — and write the
      // queue update immediately, not after the whole loop finishes.
      await FileSystem.deleteAsync(scan.imageUri, { idempotent: true });
      await removeFromQueue(scan.id);

      synced++;
      console.log(`Successfully synced offline scan: ${scan.id}`);
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`Failed to sync scan ${scan.id}:`, message);
      
      // CRITICAL FIX: If the error is an unrecoverable RLS violation or auth error,
      // permanently purge the scan so it stops looping.
      if (message.includes('row-level security') || message.includes('No active session')) {
        console.warn(`Purging unrecoverable phantom scan ${scan.id} due to security constraints.`);
        await FileSystem.deleteAsync(scan.imageUri, { idempotent: true }).catch(() => {});
        await removeFromQueue(scan.id);
        errors.push({ id: scan.id, reason: 'Dropped due to RLS/Auth violation.' });
      } else {
        errors.push({ id: scan.id, reason: message });
        // Left in the queue (not removed) — will retry on next sync.
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