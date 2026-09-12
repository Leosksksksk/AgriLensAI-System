// src/services/outbreakService.js
import { supabase } from '../../supabaseClient';
import { getValidUserSession } from '../utils/auth';

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
  const { user } = await getValidUserSession(false);
  if (!user) return 0;

  const { count, error } = await supabase
    .from('scan_results')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', user.id)
    .eq('status', 'Pending AI Analysis');

  if (error) {
    console.warn('Pending scan count error:', error);
    return 0;
  }

  return count ?? 0;
}