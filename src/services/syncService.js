import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../supabaseClient';

const QUEUE_KEY = '@offline_scan_queue';

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

    const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(scanData);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    syncOfflineScans();
  } catch (error) {
    console.error("Error saving offline scan:", error);
  }
};

export const syncOfflineScans = async () => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return;

  const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
  let queue = existingQueue ? JSON.parse(existingQueue) : [];
  if (queue.length === 0) return;

  const remainingQueue = [];

  for (const scan of queue) {
    try {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session');

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
      console.log(`Successfully synced offline scan: ${scan.id}`);
    } catch (error) {
      console.error(`Failed to sync scan ${scan.id}:`, error);
      remainingQueue.push(scan);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
};