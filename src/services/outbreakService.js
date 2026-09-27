// src/services/outbreakService.js
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';
import { getPendingScanCount as getLocalPendingScanCount } from './syncService';

export async function fetchNearbyOutbreaks() {
  const { user } = await getValidUserSession(false);
  if (!user) return [];

  const { data: farmerRow, error: farmerError } = await supabase
    .from('farmers')
    .select('barangay')
    .eq('id', user.id)
    .maybeSingle();

  if (farmerError || !farmerRow?.barangay) return [];

  const { data, error } = await supabase.rpc('get_nearby_outbreaks', {
    target_barangay: farmerRow.barangay,
  });

  if (error) {
    console.warn('Outbreak query error:', error);
    return [];
  }

  return data ?? [];
}

export async function fetchPendingScanCount() {
  const localCount = await getLocalPendingScanCount().catch(() => 0);
  const { user } = await getValidUserSession(false);
  if (!user) return localCount;

  const { data, error } = await supabase
    .from('scan_results')
    .select('id')
    .eq('farmer_id', user.id)
    .eq('status', 'Pending AI Analysis');

  if (error) {
    return localCount;
  }

  return (data?.length ?? 0) + localCount;
}