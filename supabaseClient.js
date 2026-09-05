// supabaseClient.js
import 'react-native-url-polyfill/auto'; // Required for React Native Supabase connections
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weznbdsppcjyyqgeweop.supabase.co';
const supabaseKey = 'sb_publishable_13nmI0UG-crZdf8NGWY3EQ_a9rvv3tx';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});