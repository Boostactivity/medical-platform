/**
 * Re-export du client Supabase depuis utils/supabase/client.ts
 * Ce fichier existe pour compatibilite avec les imports existants
 */
export { createClient, supabaseClient, supabaseClient as supabase } from '../utils/supabase/client';
