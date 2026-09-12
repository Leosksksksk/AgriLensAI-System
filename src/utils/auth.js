// src/utils/auth.js
import { supabase } from '../../supabaseClient';
import NetInfo from '@react-native-community/netinfo';

export async function getValidUserSession(requireAuth = true) {
  const netInfo = await NetInfo.fetch();
  const isOnline = !!netInfo.isConnected;
  
  let { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    if (isOnline) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshedSession) {
        if (requireAuth) {
          return { user: null, session: null, reason: 'no_session' };
        }
        return { user: null, session: null, reason: 'no_session' };
      }
      session = refreshedSession;
    } else {
      if (requireAuth) {
        return { user: null, session: null, reason: 'no_session' };
      }
      return { user: null, session: null, reason: 'no_session' };
    }
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (requireAuth) {
      return { user: null, session: null, reason: 'no_user' };
    }
    return { user: null, session: null, reason: 'no_user' };
  }
  
  return { user, session, reason: null };
}

export async function getCurrentUser() {
  const { user } = await getValidUserSession(false);
  return user;
}