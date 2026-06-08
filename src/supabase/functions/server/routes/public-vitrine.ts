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

/** Validation email basique (le fournisseur d'envoi revalidera côté SMTP). */
function isValidEmail(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    s.length >= 3 &&
    s.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
  );
}

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

/**
 * Inscription newsletter depuis la vitrine — visiteurs ANONYMES.
 * Body : { email, topics?: string[] }
 * Écrit via service role (aucune policy anon sur newsletter_subscriptions).
 * Réponse volontairement identique que l'email soit nouveau ou déjà
 * inscrit (pas de fuite "cet email est connu chez nous").
 */
app.post('/public/newsletter/subscribe', async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return c.json({ error: 'Adresse email invalide' }, 400);
  }

  const topics = Array.isArray(body.topics)
    ? body.topics.filter((t: unknown) => typeof t === 'string').slice(0, 10)
    : [];

  // V1 mono-tenant : tenant par défaut 'medical' (même résolution que /public/agencies)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'medical')
    .single();
  if (!tenant) {
    return c.json({ error: 'Service momentanément indisponible' }, 503);
  }

  const successMessage =
    'Merci. Votre inscription est bien prise en compte. Vous pourrez vous désinscrire à tout moment.';

  const { data: existing, error: readError } = await supabase
    .from('newsletter_subscriptions')
    .select('id, status')
    .eq('tenant_id', tenant.id)
    .eq('email', email)
    .maybeSingle();
  if (readError) {
    console.error('[PUBLIC NEWSLETTER] read error:', readError.message);
    return c.json({ error: 'Inscription impossible pour le moment, réessayez' }, 500);
  }

  if (existing) {
    // Ré-inscription d'un désinscrit, ou doublon : on réactive sans le dire
    const { error: updError } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'subscribed', topics })
      .eq('id', existing.id);
    if (updError) {
      console.error('[PUBLIC NEWSLETTER] update error:', updError.message);
      return c.json({ error: 'Inscription impossible pour le moment, réessayez' }, 500);
    }
    return c.json({ success: true, message: successMessage });
  }

  const { error: insError } = await supabase.from('newsletter_subscriptions').insert({
    tenant_id: tenant.id,
    email,
    patient_id: null, // inscription vitrine anonyme
    topics,
    status: 'subscribed',
  });
  if (insError) {
    // 23505 (course sur UNIQUE tenant+email) = déjà inscrit → même réponse
    if ((insError as any).code === '23505') {
      return c.json({ success: true, message: successMessage });
    }
    console.error('[PUBLIC NEWSLETTER] insert error:', insError.message);
    return c.json({ error: 'Inscription impossible pour le moment, réessayez' }, 500);
  }

  return c.json({ success: true, message: successMessage });
});

/**
 * Désinscription newsletter — lien anonyme par token UUID (figure dans
 * chaque envoi). Idempotent : un token déjà désinscrit répond pareil.
 */
app.get('/public/newsletter/unsubscribe', async (c) => {
  const token = c.req.query('token') ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return c.json({ error: 'Lien de désinscription invalide' }, 400);
  }

  const { data: sub, error: readError } = await supabase
    .from('newsletter_subscriptions')
    .select('id, status')
    .eq('token_unsubscribe', token)
    .maybeSingle();
  if (readError) {
    console.error('[PUBLIC NEWSLETTER] unsubscribe read error:', readError.message);
    return c.json({ error: 'Désinscription impossible pour le moment, réessayez' }, 500);
  }
  if (!sub) return c.json({ error: 'Lien de désinscription invalide' }, 404);

  if (sub.status !== 'unsubscribed') {
    const { error: updError } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'unsubscribed' })
      .eq('id', sub.id);
    if (updError) {
      console.error('[PUBLIC NEWSLETTER] unsubscribe update error:', updError.message);
      return c.json({ error: 'Désinscription impossible pour le moment, réessayez' }, 500);
    }
  }

  return c.json({
    success: true,
    message: 'Vous êtes désinscrit. Vous ne recevrez plus notre newsletter.',
  });
});

export default app;
