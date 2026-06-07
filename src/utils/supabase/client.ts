import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Créer le client IMMÉDIATEMENT au chargement du module
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseClient = createSupabaseClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-nwpbrxxxwrutacixeuxq-auth-token',
  },
});

// Export une fonction qui retourne TOUJOURS la même instance
export function createClient() {
  return supabaseClient;
}

// Export direct du client pour utilisation simple
export { supabaseClient };
export default supabaseClient;