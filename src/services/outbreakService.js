// src/services/outbreakService.js
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';
import { getPendingScanCount as getLocalPendingScanCount } from './syncService';

const MIN_REPORTING_FARMS = 1;

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

  return (data ?? []).filter((outbreak) => {
    const farmCount = Number(outbreak.farm_count);
    return outbreak.disease_id && Number.isFinite(farmCount) && farmCount >= MIN_REPORTING_FARMS;
  });
}

export async function fetchPendingOfflineScanCount() {
  return getLocalPendingScanCount().catch(() => 0);
}