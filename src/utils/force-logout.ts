import { createClient } from './supabase/client';

export async function forceLogoutAndClearTokens() {
  try {
    console.log('[FORCE LOGOUT] Clearing all auth tokens and sessions...');
    
    // Sign out from Supabase
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Clear all localStorage items related to auth
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_role');
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('[FORCE LOGOUT] ✅ All tokens cleared');
    return true;
  } catch (error) {
    console.error('[FORCE LOGOUT] Error during logout:', error);
    return false;
  }
}
