/**
 * Routes PUBLIQUES vitrine — accessibles aux visiteurs anonymes
 * (anon key Supabase, pas de session). Exposent UNIQUEMENT des
 * sous-ensembles non sensibles.
 *
 * V1 mono-tenant : agences du tenant par défaut 'medical'.
 * V2 white-label : résolution par Host header / custom_domain.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';

const app = new Hono();

/** Agences publiées pour la carte vitrine — subset safe (pas de FINESS interne). */
app.get('/public/agencies', async (c) => {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'medical')
    .single();

  if (!tenant) return c.json({ agencies: [] });

  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, address, city, postal_code, phone, lat, lng')
    .eq('tenant_id', tenant.id)
    .order('name');

  if (error) {
    console.error('[PUBLIC AGENCIES]', error.message);
    return c.json({ agencies: [] });
  }

  return c.json({ agencies: data ?? [] });
});

export default app;
