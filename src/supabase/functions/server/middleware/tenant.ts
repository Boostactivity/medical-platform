/**
 * Tenant middleware.
 *
 * Les Edge Functions utilisent SERVICE_ROLE_KEY (bypass RLS) : chaque
 * requête DB côté serveur DOIT être scopée tenant explicitement.
 * Ce middleware résout le tenant de l'utilisateur authentifié
 * (app_metadata.tenant_id, posé à l'invitation) et l'expose dans le
 * contexte : `const tenantId = c.get('tenantId')`.
 *
 * À utiliser APRÈS requireAuth :
 *   app.get('/route', requireAuth, requireTenant, handler)
 *
 * Fallback : si l'utilisateur n'a pas encore de tenant_id (comptes
 * créés avant le multi-tenant), on résout le tenant par défaut 'medical'
 * et on le persiste dans son app_metadata pour les prochains appels.
 */

import type { Context, Next } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import type { AuthEnv } from './auth.ts';

export type TenantEnv = {
  Variables: AuthEnv['Variables'] & {
    tenantId: string;
  };
};

let defaultTenantId: string | null = null;

async function resolveDefaultTenantId(): Promise<string | null> {
  if (defaultTenantId) return defaultTenantId;
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'medical')
    .single();
  defaultTenantId = data?.id ?? null;
  return defaultTenantId;
}

export const requireTenant = async (c: Context<TenantEnv>, next: Next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized - requireTenant must run after requireAuth' }, 401);
  }

  let tenantId: string | undefined = user.app_metadata?.tenant_id;

  if (!tenantId) {
    // Compte pré-multi-tenant : rattacher au tenant par défaut et persister
    const fallback = await resolveDefaultTenantId();
    if (!fallback) {
      return c.json({ error: 'Tenant introuvable - contactez votre prestataire' }, 403);
    }
    tenantId = fallback;
    // Persistance silencieuse (best effort) pour que le JWT suivant porte le claim
    supabase.auth.admin
      .updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, tenant_id: tenantId },
      })
      .catch((e: unknown) => console.error('[TENANT] backfill app_metadata failed:', e));
  }

  c.set('tenantId', tenantId);
  await next();
};
