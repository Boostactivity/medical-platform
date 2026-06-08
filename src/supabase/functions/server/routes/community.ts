/**
 * Routes COMMUNAUTÉ PATIENT MODÉRÉE — espace d'échange entre patients
 * d'un même prestataire, sous pseudonyme, avec modération a priori.
 * À monter dans index.tsx : `app.route(prefix, communityRoutes);`
 * (paths /patient/community/*, /pro-community/*).
 *
 * Règles dures :
 *   - Middlewares scopés PAR CHEMIN (jamais use('*')) : monté au préfixe
 *     racine, un '*' avalerait les routes des sub-apps montées après.
 *   - ANONYMAT : le vrai nom du patient n'est JAMAIS renvoyé côté
 *     patient — uniquement le pseudonyme (community_profiles). Le staff
 *     du tenant voit le pseudonyme + l'identité pour la modération.
 *   - MODÉRATION A PRIORI : tout post / réponse naît 'pending' et n'est
 *     visible des autres patients qu'après 'approved' par le staff.
 *   - PAS DE PRESSION SOCIALE : aucun like, aucun score, aucun
 *     classement. Signalement possible, traité côté pro.
 *   - PAS DE CONSEIL MÉDICAL entre patients : charte affichée côté
 *     front — l'équipe et le médecin restent les référents.
 *
 * Côté patient (requireRole('patient')) :
 * - GET   /patient/community/profil            : mon profil (pseudonyme) ou null
 * - POST  /patient/community/profil            : créer / modifier mon pseudonyme
 *                                                (généré "Membre NNNN" si vide)
 * - GET   /patient/community/posts             : discussions approuvées du tenant
 *                                                + mes propres posts (tous statuts)
 * - POST  /patient/community/posts             : nouvelle discussion → pending
 * - GET   /patient/community/posts/:id         : discussion (approved ou la mienne)
 *                                                + réponses approved + mes pending
 * - POST  /patient/community/posts/:id/reponses: répondre (post approved) → pending
 * - POST  /patient/community/signalements      : signaler un post / une réponse
 * - GET   /patient/community/partners          : associations de patients (socle
 *                                                commun + entrées du tenant)
 *
 * Côté pro (requireRole('admin','prestataire')) :
 * - GET   /pro-community/moderation?status=    : file posts + réponses (def. pending)
 * - PATCH /pro-community/moderation/:kind/:id  : approve / reject (raison) / remove
 * - GET   /pro-community/reports?status=       : signalements (def. open) + contenu visé
 * - PATCH /pro-community/reports/:id           : marquer traité (+ retrait optionnel)
 *
 * Schéma : migration 111 (community_profiles, community_posts,
 * community_replies, community_reports, community_partners).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Scopé par chemin (pas '*') : monté au préfixe racine, un '*' avalerait
// les routes des sub-apps montées après (bug connu d'interception).
app.use('/patient/community/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/pro-community/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// ------------------------------------------------------------------
// Constantes métier
// ------------------------------------------------------------------

const MODERATION_STATUSES = ['pending', 'approved', 'rejected', 'removed'] as const;

// Pseudonyme : lettres (accents inclus), chiffres, espace, tiret,
// underscore, apostrophe — pas d'@ ni d'URL pour limiter la
// dé-anonymisation par email / lien.
const PSEUDONYM_RE = /^[\p{L}\p{N} _\-']{3,30}$/u;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface PatientRow {
  id: string;
  user_id: string;
}

/**
 * Résout la ligne patients de l'utilisateur connecté (scopée tenant,
 * fallback legacy sans tenant — même pattern que patient-services.ts).
 */
async function resolvePatient(c: any): Promise<PatientRow | null> {
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  const { data } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (data) return data as PatientRow;

  const { data: legacy } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return (legacy as PatientRow) ?? null;
}

interface ProfileRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  pseudonym: string;
  created_at: string;
}

/** Profil communautaire du patient connecté (null si pas encore créé). */
async function resolveProfile(c: any, patient: PatientRow): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('community_profiles')
    .select('id, tenant_id, patient_id, pseudonym, created_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();
  return (data as ProfileRow) ?? null;
}

/** Pseudonyme déjà pris dans le tenant (insensible à la casse) ? */
async function pseudonymTaken(
  tenantId: string,
  pseudonym: string,
  excludeProfileId?: string,
): Promise<boolean> {
  let query = supabase
    .from('community_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('pseudonym', pseudonym);
  if (excludeProfileId) query = query.neq('id', excludeProfileId);
  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

/** Génère un pseudonyme "Membre NNNN" libre dans le tenant. */
async function generatePseudonym(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `Membre ${1000 + Math.floor(Math.random() * 9000)}`;
    if (!(await pseudonymTaken(tenantId, candidate))) return candidate;
  }
  // Dernier recours : suffixe temporel, collision quasi impossible
  return `Membre ${Date.now() % 100000}`;
}

/** Map profil_id → pseudonyme (jamais le vrai nom côté patient). */
async function fetchPseudonyms(profileIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (profileIds.length === 0) return map;
  const { data } = await supabase
    .from('community_profiles')
    .select('id, pseudonym')
    .in('id', profileIds);
  for (const p of data ?? []) map.set(p.id, p.pseudonym);
  return map;
}

/** Identités réelles (pour les vues PRO uniquement — jamais côté patient). */
async function fetchProfileIdentities(profileIds: string[]) {
  const identity = new Map<
    string,
    { pseudonym: string; patient_name: string | null; patient_email: string | null }
  >();
  if (profileIds.length === 0) return identity;

  const { data: profiles } = await supabase
    .from('community_profiles')
    .select('id, pseudonym, patient_id')
    .in('id', profileIds);

  const patientIds = [...new Set((profiles ?? []).map((p) => p.patient_id).filter(Boolean))];
  const userIdByPatient = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, user_id')
      .in('id', patientIds);
    for (const p of patients ?? []) userIdByPatient.set(p.id, p.user_id);
  }

  const userIds = [...new Set([...userIdByPatient.values()].filter(Boolean))];
  const userById = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    for (const u of users ?? []) userById.set(u.id, { name: u.name, email: u.email });
  }

  for (const profile of profiles ?? []) {
    const userId = userIdByPatient.get(profile.patient_id);
    const user = userId ? userById.get(userId) : undefined;
    identity.set(profile.id, {
      pseudonym: profile.pseudonym,
      patient_name: user?.name ?? null,
      patient_email: user?.email ?? null,
    });
  }
  return identity;
}

// ==================================================================
// PATIENT — PROFIL (pseudonyme)
// ==================================================================

// GET /patient/community/profil — mon profil ou null (première visite)
app.get('/patient/community/profil', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const profile = await resolveProfile(c, patient);
  return c.json({
    profile: profile
      ? { id: profile.id, pseudonym: profile.pseudonym, created_at: profile.created_at }
      : null,
  });
});

// POST /patient/community/profil — créer (ou renommer) mon pseudonyme.
// Body : { pseudonym?: string } — vide → généré "Membre NNNN".
app.post('/patient/community/profil', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));
  const requested = typeof body.pseudonym === 'string' ? body.pseudonym.trim() : '';

  let pseudonym: string;
  if (requested) {
    if (!PSEUDONYM_RE.test(requested)) {
      return c.json(
        { error: 'Le pseudonyme doit faire 3 à 30 caractères (lettres, chiffres, espaces, tirets)' },
        400,
      );
    }
    pseudonym = requested;
  } else {
    pseudonym = await generatePseudonym(tenantId);
  }

  const existing = await resolveProfile(c, patient);

  if (requested && (await pseudonymTaken(tenantId, pseudonym, existing?.id))) {
    return c.json({ error: 'Ce pseudonyme est déjà utilisé, choisissez-en un autre' }, 409);
  }

  if (existing) {
    const { data: updated, error } = await supabase
      .from('community_profiles')
      .update({ pseudonym })
      .eq('id', existing.id)
      .select('id, pseudonym, created_at')
      .single();
    if (error) {
      console.error('[COMMUNITY] profile update error:', error.message);
      return c.json({ error: 'Impossible de modifier votre pseudonyme, réessayez' }, 500);
    }
    return c.json({ success: true, profile: updated });
  }

  const { data: created, error } = await supabase
    .from('community_profiles')
    .insert({ tenant_id: tenantId, patient_id: patient.id, pseudonym })
    .select('id, pseudonym, created_at')
    .single();
  if (error) {
    console.error('[COMMUNITY] profile insert error:', error.message);
    return c.json({ error: 'Impossible de créer votre profil, réessayez' }, 500);
  }
  return c.json({ success: true, profile: created });
});

// ==================================================================
// PATIENT — DISCUSSIONS
// ==================================================================

// GET /patient/community/posts — discussions approuvées du tenant
// (titre, pseudonyme, nb de réponses approuvées, date) + mes posts
// quel que soit le statut (badge "En attente de validation").
app.get('/patient/community/posts', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');
  const profile = await resolveProfile(c, patient);

  const { data: approved, error } = await supabase
    .from('community_posts')
    .select('id, author_profile_id, title, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return c.json({ error: error.message }, 500);

  // Nb de réponses approuvées par discussion
  const postIds = (approved ?? []).map((p) => p.id);
  const replyCount = new Map<string, number>();
  if (postIds.length > 0) {
    const { data: replies } = await supabase
      .from('community_replies')
      .select('post_id')
      .in('post_id', postIds)
      .eq('status', 'approved');
    for (const r of replies ?? []) {
      replyCount.set(r.post_id, (replyCount.get(r.post_id) ?? 0) + 1);
    }
  }

  const pseudonyms = await fetchPseudonyms(
    [...new Set((approved ?? []).map((p) => p.author_profile_id))],
  );

  // Mes posts (tous statuts) — visibles uniquement par moi
  let mine: any[] = [];
  if (profile) {
    const { data: myPosts } = await supabase
      .from('community_posts')
      .select('id, title, status, reject_reason, created_at')
      .eq('author_profile_id', profile.id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);
    mine = myPosts ?? [];
  }

  return c.json({
    posts: (approved ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      pseudonym: pseudonyms.get(p.author_profile_id) ?? 'Membre',
      reply_count: replyCount.get(p.id) ?? 0,
      created_at: p.created_at,
    })),
    my_posts: mine,
  });
});

// POST /patient/community/posts — nouvelle discussion → pending.
// Body : { title, body }
app.post('/patient/community/posts', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const profile = await resolveProfile(c, patient);
  if (!profile) {
    return c.json({ error: 'Choisissez d\'abord votre pseudonyme pour participer' }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.body === 'string' ? body.body.trim() : '';

  if (!title || title.length > 150) {
    return c.json({ error: 'Le titre est requis (150 caractères maximum)' }, 400);
  }
  if (!content || content.length > 3000) {
    return c.json({ error: 'Le message est requis (3000 caractères maximum)' }, 400);
  }

  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({
      tenant_id: c.get('tenantId'),
      author_profile_id: profile.id,
      title,
      body: content,
      status: 'pending',
    })
    .select('id, title, body, status, created_at')
    .single();
  if (error) {
    console.error('[COMMUNITY] post insert error:', error.message);
    return c.json({ error: 'Impossible de publier votre message, réessayez' }, 500);
  }

  return c.json({ success: true, post });
});

// GET /patient/community/posts/:id — fil de discussion.
// Visible si approved OU si c'est le mien (pending/rejected inclus).
// Réponses : approved + MES réponses en attente.
app.get('/patient/community/posts/:id', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');
  const profile = await resolveProfile(c, patient);

  const { data: post, error } = await supabase
    .from('community_posts')
    .select('id, author_profile_id, title, body, status, reject_reason, created_at')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);

  const isMine = !!profile && post?.author_profile_id === profile.id;
  if (!post || (post.status !== 'approved' && !isMine)) {
    return c.json({ error: 'Discussion introuvable' }, 404);
  }

  const { data: replies, error: repliesError } = await supabase
    .from('community_replies')
    .select('id, author_profile_id, body, status, created_at')
    .eq('post_id', post.id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (repliesError) return c.json({ error: repliesError.message }, 500);

  // approved pour tous + mes propres réponses non publiées
  const visibleReplies = (replies ?? []).filter(
    (r) =>
      r.status === 'approved' ||
      (!!profile && r.author_profile_id === profile.id && r.status !== 'removed'),
  );

  const pseudonyms = await fetchPseudonyms([
    post.author_profile_id,
    ...new Set(visibleReplies.map((r) => r.author_profile_id)),
  ]);

  return c.json({
    post: {
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      reject_reason: isMine ? post.reject_reason : null,
      pseudonym: pseudonyms.get(post.author_profile_id) ?? 'Membre',
      is_mine: isMine,
      created_at: post.created_at,
    },
    replies: visibleReplies.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      pseudonym: pseudonyms.get(r.author_profile_id) ?? 'Membre',
      is_mine: !!profile && r.author_profile_id === profile.id,
      created_at: r.created_at,
    })),
  });
});

// POST /patient/community/posts/:id/reponses — répondre → pending.
// Body : { body } — uniquement sur une discussion approuvée.
app.post('/patient/community/posts/:id/reponses', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const profile = await resolveProfile(c, patient);
  if (!profile) {
    return c.json({ error: 'Choisissez d\'abord votre pseudonyme pour participer' }, 409);
  }

  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));
  const content = typeof body.body === 'string' ? body.body.trim() : '';
  if (!content || content.length > 2000) {
    return c.json({ error: 'Le message est requis (2000 caractères maximum)' }, 400);
  }

  const { data: post } = await supabase
    .from('community_posts')
    .select('id, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!post || post.status !== 'approved') {
    return c.json({ error: 'Discussion introuvable ou non publiée' }, 404);
  }

  const { data: reply, error } = await supabase
    .from('community_replies')
    .insert({
      post_id: post.id,
      tenant_id: tenantId,
      author_profile_id: profile.id,
      body: content,
      status: 'pending',
    })
    .select('id, body, status, created_at')
    .single();
  if (error) {
    console.error('[COMMUNITY] reply insert error:', error.message);
    return c.json({ error: 'Impossible d\'envoyer votre réponse, réessayez' }, 500);
  }

  return c.json({ success: true, reply });
});

// ==================================================================
// PATIENT — SIGNALEMENTS
// ==================================================================

// POST /patient/community/signalements
// Body : { target_kind: 'post'|'reply', target_id, reason }
app.post('/patient/community/signalements', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const profile = await resolveProfile(c, patient);
  if (!profile) {
    return c.json({ error: 'Choisissez d\'abord votre pseudonyme pour participer' }, 409);
  }

  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));
  const targetKind = body.target_kind;
  const targetId = body.target_id;
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';

  if (!['post', 'reply'].includes(targetKind) || !targetId || typeof targetId !== 'string') {
    return c.json({ error: 'Signalement invalide (target_kind et target_id requis)' }, 400);
  }
  if (!reason) {
    return c.json({ error: 'Indiquez la raison de votre signalement' }, 400);
  }

  // Le contenu visé doit exister dans le tenant et être publié
  const table = targetKind === 'post' ? 'community_posts' : 'community_replies';
  const { data: target } = await supabase
    .from(table)
    .select('id, status')
    .eq('id', targetId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!target || target.status !== 'approved') {
    return c.json({ error: 'Contenu introuvable' }, 404);
  }

  // Anti-doublon : un signalement ouvert par membre et par contenu
  const { data: existing } = await supabase
    .from('community_reports')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('target_kind', targetKind)
    .eq('target_id', targetId)
    .eq('reporter_profile_id', profile.id)
    .eq('status', 'open')
    .limit(1);
  if ((existing ?? []).length > 0) {
    return c.json({ error: 'Vous avez déjà signalé ce contenu, votre prestataire le traite' }, 409);
  }

  const { data: report, error } = await supabase
    .from('community_reports')
    .insert({
      tenant_id: tenantId,
      target_kind: targetKind,
      target_id: targetId,
      reporter_profile_id: profile.id,
      reason,
      status: 'open',
    })
    .select('id, status, created_at')
    .single();
  if (error) {
    console.error('[COMMUNITY] report insert error:', error.message);
    return c.json({ error: 'Impossible d\'envoyer votre signalement, réessayez' }, 500);
  }

  return c.json({ success: true, report });
});

// ==================================================================
// PATIENT — ASSOCIATIONS DE PATIENTS
// ==================================================================

// GET /patient/community/partners — socle commun (tenant NULL) + tenant
app.get('/patient/community/partners', async (c) => {
  const tenantId = c.get('tenantId');
  const { data, error } = await supabase
    .from('community_partners')
    .select('id, name, url, description, display_order')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ partners: data ?? [] });
});

// ==================================================================
// PRO — FILE DE MODÉRATION
// ==================================================================

// GET /pro-community/moderation?status=pending — posts + réponses du
// tenant dans ce statut, avec pseudonyme + identité réelle (modération)
// et le titre de la discussion pour les réponses (contexte).
app.get('/pro-community/moderation', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status') ?? 'pending';
  if (!MODERATION_STATUSES.includes(status as any)) {
    return c.json({ error: `status invalide (${MODERATION_STATUSES.join(', ')})` }, 400);
  }

  const [postsRes, repliesRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, author_profile_id, title, body, status, reject_reason, moderated_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('community_replies')
      .select('id, post_id, author_profile_id, body, status, reject_reason, moderated_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(200),
  ]);
  if (postsRes.error) return c.json({ error: postsRes.error.message }, 500);
  if (repliesRes.error) return c.json({ error: repliesRes.error.message }, 500);

  const posts = postsRes.data ?? [];
  const replies = repliesRes.data ?? [];

  // Contexte des réponses : titre + statut de la discussion parente
  const parentIds = [...new Set(replies.map((r) => r.post_id))];
  const parentById = new Map<string, { title: string; status: string }>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from('community_posts')
      .select('id, title, status')
      .in('id', parentIds);
    for (const p of parents ?? []) parentById.set(p.id, { title: p.title, status: p.status });
  }

  const identities = await fetchProfileIdentities([
    ...new Set([...posts, ...replies].map((item) => item.author_profile_id)),
  ]);

  const withIdentity = (item: any) => {
    const id = identities.get(item.author_profile_id);
    return {
      pseudonym: id?.pseudonym ?? 'Membre',
      patient_name: id?.patient_name ?? null,
      patient_email: id?.patient_email ?? null,
    };
  };

  return c.json({
    items: [
      ...posts.map((p) => ({
        kind: 'post' as const,
        id: p.id,
        title: p.title,
        body: p.body,
        status: p.status,
        reject_reason: p.reject_reason,
        moderated_at: p.moderated_at,
        created_at: p.created_at,
        post_title: null,
        ...withIdentity(p),
      })),
      ...replies.map((r) => ({
        kind: 'reply' as const,
        id: r.id,
        title: null,
        body: r.body,
        status: r.status,
        reject_reason: r.reject_reason,
        moderated_at: r.moderated_at,
        created_at: r.created_at,
        post_title: parentById.get(r.post_id)?.title ?? null,
        ...withIdentity(r),
      })),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  });
});

// PATCH /pro-community/moderation/:kind/:id
// Body : { action: 'approve' } | { action: 'reject', reason } | { action: 'remove' }
//   approve : pending → approved
//   reject  : pending → rejected (raison visible par l'auteur uniquement)
//   remove  : approved → removed (retrait après publication)
app.patch('/pro-community/moderation/:kind/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const kind = c.req.param('kind');
  if (!['post', 'reply'].includes(kind)) {
    return c.json({ error: 'kind invalide (post ou reply)' }, 400);
  }
  const table = kind === 'post' ? 'community_posts' : 'community_replies';

  const body = await c.req.json().catch(() => ({}));
  const action = body.action;
  if (!['approve', 'reject', 'remove'].includes(action)) {
    return c.json({ error: 'action invalide (approve, reject ou remove)' }, 400);
  }

  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (action === 'reject' && !reason) {
    return c.json({ error: 'Indiquez la raison du rejet (visible par l\'auteur)' }, 400);
  }

  const { data: item, error: readError } = await supabase
    .from(table)
    .select('id, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!item) return c.json({ error: 'Contenu introuvable' }, 404);

  let nextStatus: string;
  if (action === 'approve') {
    if (item.status !== 'pending') {
      return c.json({ error: `Ce contenu est déjà ${item.status}` }, 409);
    }
    nextStatus = 'approved';
  } else if (action === 'reject') {
    if (item.status !== 'pending') {
      return c.json({ error: `Ce contenu est déjà ${item.status}` }, 409);
    }
    nextStatus = 'rejected';
  } else {
    if (item.status !== 'approved') {
      return c.json({ error: 'Seul un contenu publié peut être retiré' }, 409);
    }
    nextStatus = 'removed';
  }

  const { data: updated, error: updError } = await supabase
    .from(table)
    .update({
      status: nextStatus,
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
      reject_reason: action === 'reject' ? reason : null,
    })
    .eq('id', item.id)
    .select('id, status, moderated_at, reject_reason')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, item: updated, kind });
});

// ==================================================================
// PRO — SIGNALEMENTS
// ==================================================================

// GET /pro-community/reports?status=open — signalements + contenu visé
app.get('/pro-community/reports', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status') ?? 'open';
  if (!['open', 'handled', 'all'].includes(status)) {
    return c.json({ error: 'status invalide (open, handled ou all)' }, 400);
  }

  let query = supabase
    .from('community_reports')
    .select('id, target_kind, target_id, reporter_profile_id, reason, status, handled_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);

  const { data: reports, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  // Contenu visé (extrait + statut) — par type
  const postIds = (reports ?? []).filter((r) => r.target_kind === 'post').map((r) => r.target_id);
  const replyIds = (reports ?? []).filter((r) => r.target_kind === 'reply').map((r) => r.target_id);

  const targetById = new Map<string, { excerpt: string; status: string }>();
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, title, body, status')
      .in('id', postIds);
    for (const p of posts ?? []) {
      targetById.set(`post:${p.id}`, { excerpt: `${p.title} — ${p.body}`.slice(0, 300), status: p.status });
    }
  }
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('community_replies')
      .select('id, body, status')
      .in('id', replyIds);
    for (const r of replies ?? []) {
      targetById.set(`reply:${r.id}`, { excerpt: r.body.slice(0, 300), status: r.status });
    }
  }

  const identities = await fetchProfileIdentities(
    [...new Set((reports ?? []).map((r) => r.reporter_profile_id))],
  );

  return c.json({
    reports: (reports ?? []).map((r) => {
      const target = targetById.get(`${r.target_kind}:${r.target_id}`);
      return {
        id: r.id,
        target_kind: r.target_kind,
        target_id: r.target_id,
        target_excerpt: target?.excerpt ?? null,
        target_status: target?.status ?? null,
        reporter_pseudonym: identities.get(r.reporter_profile_id)?.pseudonym ?? 'Membre',
        reason: r.reason,
        status: r.status,
        handled_at: r.handled_at,
        created_at: r.created_at,
      };
    }),
  });
});

// PATCH /pro-community/reports/:id
// Body : { action: 'handle', remove_target?: boolean }
//   handle : open → handled ; remove_target=true retire aussi le
//   contenu visé (status 'removed') s'il est encore publié.
app.patch('/pro-community/reports/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  if (body.action !== 'handle') {
    return c.json({ error: 'action invalide (handle)' }, 400);
  }

  const { data: report, error: readError } = await supabase
    .from('community_reports')
    .select('id, target_kind, target_id, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!report) return c.json({ error: 'Signalement introuvable' }, 404);
  if (report.status !== 'open') {
    return c.json({ error: 'Signalement déjà traité' }, 409);
  }

  // Retrait optionnel du contenu visé (si encore publié)
  if (body.remove_target === true) {
    const table = report.target_kind === 'post' ? 'community_posts' : 'community_replies';
    const { error: removeError } = await supabase
      .from(table)
      .update({
        status: 'removed',
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', report.target_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'approved');
    if (removeError) {
      console.error('[COMMUNITY] report remove target error:', removeError.message);
      return c.json({ error: 'Impossible de retirer le contenu signalé' }, 500);
    }
  }

  const { data: updated, error: updError } = await supabase
    .from('community_reports')
    .update({
      status: 'handled',
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq('id', report.id)
    .select('id, status, handled_at')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, report: updated });
});

export default app;
