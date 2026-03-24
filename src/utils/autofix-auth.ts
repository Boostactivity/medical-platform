import { projectId, publicAnonKey } from './supabase/info';

let isFixing = false;
let hasAttemptedFix = false;

export async function autoFixAuthOnError() {
  // Only try once per session
  if (hasAttemptedFix || isFixing) {
    return false;
  }

  // Check if we're in a valid environment
  if (!projectId || !publicAnonKey || projectId === 'your-project-id') {
    return false;
  }

  try {
    isFixing = true;
    hasAttemptedFix = true;

    console.log('[AUTO-FIX] Attempting to fix authentication metadata with force reset...');

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/force-reset-demo-accounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[AUTO-FIX] Failed to fix auth:', await response.text());
      return false;
    }

    const results = await response.json();
    console.log('[AUTO-FIX] Auth metadata fixed successfully:', results);
    
    // Clear any existing tokens to force re-login with new metadata
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    localStorage.removeItem('user_role');
    
    return true;
  } catch (error) {
    console.error('[AUTO-FIX] Error during auto-fix:', error);
    return false;
  } finally {
    isFixing = false;
  }
}

export function resetAutoFixFlag() {
  hasAttemptedFix = false;
}
