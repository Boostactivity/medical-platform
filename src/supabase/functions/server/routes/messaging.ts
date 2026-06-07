/**
 * MESSAGERIE SÉCURISÉE — patient ↔ équipe prestataire ↔ médecin.
 * Monté à la racine du prefix via routes/dashboards.ts (index.tsx inchangé,
 * même mécanique que doctor-portal.ts).
 *
 * Tables : conversations + conversation_messages (migration 109).
 * La table legacy `messages` (sender/receiver 1-à-1, sans tenant) n'est
 * PAS utilisée ici.
 *
 * Middlewares scopés PAR CHEMIN — jamais use('*') (un '*' sur une sub-app
 * montée à la racine avalerait les routes montées après elle) :
 *   - /messages/patient/* : patient — UNIQUEMENT ses conversations
 *     (user.id → patients.user_id → patients.id, scopé tenant)
 *   - /messages/pro/*     : admin/prestataire — tout le tenant
 *   - /messages/doctor/*  : médecin — kind='medical' de SES patients
 *     assignés (patients.assigned_doctor_id = auth user id, convention 105)
 *
 * Non-lus : read_by JSONB = liste d'auth user ids ayant lu le message.
 * Un message est non lu pour un utilisateur s'il n'en est pas l'expéditeur
 * et que son id n'est pas dans read_by. GET .../messages marque lu.
 *
 * - GET    /messages/patient/conversations
 * - POST   /messages/patient/conversations               (sujet + 1er message)
 * - GET    /messages/patient/conversations/:id/messages  (marque lu)
 * - POST   /messages/patient/conversations/:id/messages
 * - GET    /messages/pro/conversations?status=&kind=
 * - POST   /messages/pro/conversations                   (patient_id + sujet + message)
 * - GET    /messages/pro/conversations/:id/messages      (marque lu)
 * - POST   /messages/pro/conversations/:id/messages
 * - PATCH  /messages/pro/conversations/:id               (clôturer / réouvrir)
 * - GET    /messages/doctor/conversations
 * - GET    /messages/doctor/conversations/:id/messages   (marque lu)
 * - POST   /messages/doctor/conversations/:id/messages
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

app.use('/messages/patient/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/messages/pro/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);
app.use('/messages/doctor/*', requireAuth, requireRole('doctor'), requireTenant);

// ------------------------------------------------------------------
// Constantes & helpers
// ------------------------------------------------------------------

const MAX_SUBJECT = 200;
const MAX_CONTENT = 4000;
const KINDS = ['patient_support', 'medical'] as const;
const SENDER_ROLES = ['patient', 'prestataire', 'admin', 'doctor'] as const;

type SenderRole = (typeof SENDER_ROLES)[number];

/** Rôle d'expéditeur dérivé du JWT (jamais du body). */
function senderRoleOf(user: any): SenderRole | null {
  const role = user?.user_metadata?.role;
  return SENDER_ROLES.includes(role) ? (role as SenderRole) : null;
}

/** Résout la ligne patients de l'utilisateur connecté (pattern patient-portal). */
async function resolvePatient(c: any): Promise<{ id: string } | null> {
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (data) return data;

  // Comptes legacy backfillés par la migration 100 mais jamais re-lus
  const { data: legacy } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return legacy ?? null;
}

function isUnreadFor(msg: any, userId: string): boolean {
  if (msg.sender_id === userId) return false;
  const readBy: unknown[] = Array.isArray(msg.read_by) ? msg.read_by : [];
  return !readBy.includes(userId);
}

/**
 * Dernier message + compteur non-lus par conversation, en UNE requête.
 * Cap volontaire à 2000 messages récents : suffisant pour des listes
 * limitées à 100 conversations.
 */
async function summarizeConversations(conversationIds: string[], userId: string) {
  const lastByConv = new Map<string, any>();
  const unreadByConv = new Map<string, number>();
  if (conversationIds.length === 0) return { lastByConv, unreadByConv };

  const { data, error } = await supabase
    .from('conversation_messages')
    .select('conversation_id, sender_id, sender_role, content, read_by, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[MESSAGING] summarize error:', error.message);
    return { lastByConv, unreadByConv };
  }

  for (const m of data ?? []) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    if (isUnreadFor(m, userId)) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  }
  return { lastByConv, unreadByConv };
}

/** Noms des patients (patients.id → users.name) pour les listes pro/médecin. */
async function patientNames(patientIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (patientIds.length === 0) return names;

  const { data, error } = await supabase
    .from('patients')
    .select('id, users!patients_user_id_fkey(name)')
    .in('id', patientIds);

  if (error) {
    console.error('[MESSAGING] patientNames error:', error.message);
    return names;
  }
  for (const p of data ?? []) names.set(p.id, p.users?.name ?? '—');
  return names;
}

function serializeConversation(conv: any, last: any, unread: number, patientName?: string) {
  return {
    id: conv.id,
    patient_id: conv.patient_id,
    patient_name: patientName ?? undefined,
    subject: conv.subject,
    kind: conv.kind,
    status: conv.status,
    created_at: conv.created_at,
    last_message_at: conv.last_message_at,
    last_message: last
      ? { content: last.content, sender_role: last.sender_role, created_at: last.created_at }
      : null,
    unread_count: unread,
  };
}

/**
 * Fil complet d'une conversation + marquage lu pour l'utilisateur courant.
 * Renvoie les messages ASC avec le nom de chaque expéditeur.
 */
async function listMessagesAndMarkRead(c: any, conversation: any) {
  const user = c.get('user');

  const { data: rows, error } = await supabase
    .from('conversation_messages')
    .select('id, conversation_id, sender_id, sender_role, content, read_by, created_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) return c.json({ error: error.message }, 500);
  const messages = rows ?? [];

  // Marquage lu : append de user.id dans read_by des messages des autres.
  const unread = messages.filter((m) => isUnreadFor(m, user.id));
  if (unread.length > 0) {
    const results = await Promise.all(
      unread.map((m) =>
        supabase
          .from('conversation_messages')
          .update({ read_by: [...(Array.isArray(m.read_by) ? m.read_by : []), user.id] })
          .eq('id', m.id),
      ),
    );
    for (const r of results) {
      if (r.error) console.error('[MESSAGING] mark read error:', r.error.message);
    }
  }

  // Noms des expéditeurs
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const nameById = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', senderIds);
    for (const u of users ?? []) nameById.set(u.id, u.name ?? '—');
  }

  return c.json({
    conversation: serializeConversation(conversation, messages[messages.length - 1] ?? null, 0),
    messages: messages.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_role: m.sender_role,
      sender_name: nameById.get(m.sender_id) ?? '—',
      content: m.content,
      created_at: m.created_at,
      is_mine: m.sender_id === user.id,
    })),
  });
}

/** Ajoute un message dans un fil ouvert + met à jour last_message_at. */
async function postMessage(c: any, conversation: any) {
  const user = c.get('user');
  const role = senderRoleOf(user);
  if (!role) return c.json({ error: 'Rôle utilisateur invalide' }, 403);

  if (conversation.status === 'closed') {
    return c.json({ error: 'Cette conversation est clôturée' }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (content.length === 0 || content.length > MAX_CONTENT) {
    return c.json({ error: `Message requis (${MAX_CONTENT} caractères maximum)` }, 400);
  }

  const { data: message, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversation.id,
      tenant_id: conversation.tenant_id,
      sender_id: user.id,
      sender_role: role,
      content,
    })
    .select('id, sender_id, sender_role, content, created_at')
    .single();

  if (error) {
    console.error('[MESSAGING] message insert error:', error.message);
    return c.json({ error: 'Impossible d\'envoyer le message, réessayez' }, 500);
  }

  const { error: touchErr } = await supabase
    .from('conversations')
    .update({ last_message_at: message.created_at })
    .eq('id', conversation.id);
  if (touchErr) console.error('[MESSAGING] last_message_at update error:', touchErr.message);

  return c.json({ success: true, message: { ...message, is_mine: true } }, 201);
}

/** Crée une conversation + son premier message (rollback si message KO). */
async function createConversation(
  c: any,
  params: { patientId: string; subject: string; content: string; kind: string },
) {
  const user = c.get('user');
  const tenantId = c.get('tenantId');
  const role = senderRoleOf(user);
  if (!role) return c.json({ error: 'Rôle utilisateur invalide' }, 403);

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      patient_id: params.patientId,
      subject: params.subject,
      kind: params.kind,
      status: 'open',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[MESSAGING] conversation insert error:', error.message);
    return c.json({ error: 'Impossible de créer la conversation, réessayez' }, 500);
  }

  const { data: message, error: msgErr } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversation.id,
      tenant_id: tenantId,
      sender_id: user.id,
      sender_role: role,
      content: params.content,
    })
    .select('id, sender_id, sender_role, content, created_at')
    .single();

  if (msgErr) {
    console.error('[MESSAGING] first message insert error:', msgErr.message);
    // Pas de conversation vide orpheline
    await supabase.from('conversations').delete().eq('id', conversation.id);
    return c.json({ error: 'Impossible de créer la conversation, réessayez' }, 500);
  }

  return c.json(
    {
      success: true,
      conversation: serializeConversation(conversation, message, 0),
    },
    201,
  );
}

/** Valide sujet + contenu + kind d'une création de conversation. */
function parseCreateBody(body: any): { subject: string; content: string; kind: string } | string {
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const kind = body.kind ?? 'patient_support';

  if (subject.length === 0 || subject.length > MAX_SUBJECT) {
    return `Sujet requis (${MAX_SUBJECT} caractères maximum)`;
  }
  if (content.length === 0 || content.length > MAX_CONTENT) {
    return `Message requis (${MAX_CONTENT} caractères maximum)`;
  }
  if (!KINDS.includes(kind)) {
    return 'Type de conversation invalide (patient_support ou medical)';
  }
  return { subject, content, kind };
}

// ------------------------------------------------------------------
// PATIENT — /messages/patient/*
// ------------------------------------------------------------------

/** Conversation appartenant au patient connecté, sinon null. */
async function getPatientConversation(c: any, conversationId: string) {
  const patient = await resolvePatient(c);
  if (!patient) return null;

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();
  return data ?? null;
}

app.get('/messages/patient/conversations', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (error) return c.json({ error: error.message }, 500);

  const conversations = data ?? [];
  const userId = c.get('user').id;
  const { lastByConv, unreadByConv } = await summarizeConversations(
    conversations.map((cv) => cv.id),
    userId,
  );

  return c.json({
    conversations: conversations.map((cv) =>
      serializeConversation(cv, lastByConv.get(cv.id) ?? null, unreadByConv.get(cv.id) ?? 0),
    ),
  });
});

app.post('/messages/patient/conversations', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = parseCreateBody(body);
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);

  return createConversation(c, { patientId: patient.id, ...parsed });
});

app.get('/messages/patient/conversations/:id/messages', async (c) => {
  const conversation = await getPatientConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return listMessagesAndMarkRead(c, conversation);
});

app.post('/messages/patient/conversations/:id/messages', async (c) => {
  const conversation = await getPatientConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return postMessage(c, conversation);
});

// ------------------------------------------------------------------
// PRO (admin / prestataire) — /messages/pro/*
// ------------------------------------------------------------------

/** Conversation du tenant courant, sinon null. */
async function getProConversation(c: any, conversationId: string) {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();
  return data ?? null;
}

app.get('/messages/pro/conversations', async (c) => {
  const status = c.req.query('status');
  const kind = c.req.query('kind');

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', c.get('tenantId'))
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (status && ['open', 'closed'].includes(status)) query = query.eq('status', status);
  if (kind && KINDS.includes(kind as any)) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const conversations = data ?? [];
  const userId = c.get('user').id;
  const [{ lastByConv, unreadByConv }, names] = await Promise.all([
    summarizeConversations(conversations.map((cv) => cv.id), userId),
    patientNames([...new Set(conversations.map((cv) => cv.patient_id))]),
  ]);

  return c.json({
    conversations: conversations.map((cv) =>
      serializeConversation(
        cv,
        lastByConv.get(cv.id) ?? null,
        unreadByConv.get(cv.id) ?? 0,
        names.get(cv.patient_id) ?? '—',
      ),
    ),
  });
});

app.post('/messages/pro/conversations', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const patientId = typeof body.patient_id === 'string' ? body.patient_id : '';
  if (!patientId) return c.json({ error: 'patient_id est requis' }, 400);

  const parsed = parseCreateBody(body);
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);

  // Le patient doit exister dans le tenant courant
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();
  if (!patient) return c.json({ error: 'Patient introuvable dans votre organisation' }, 404);

  return createConversation(c, { patientId: patient.id, ...parsed });
});

app.get('/messages/pro/conversations/:id/messages', async (c) => {
  const conversation = await getProConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return listMessagesAndMarkRead(c, conversation);
});

app.post('/messages/pro/conversations/:id/messages', async (c) => {
  const conversation = await getProConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return postMessage(c, conversation);
});

app.patch('/messages/pro/conversations/:id', async (c) => {
  const conversation = await getProConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const status = body.status as string;
  if (!['open', 'closed'].includes(status)) {
    return c.json({ error: 'status invalide (open ou closed)' }, 400);
  }

  const { data, error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversation.id)
    .eq('tenant_id', c.get('tenantId'))
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, conversation: serializeConversation(data, null, 0) });
});

// ------------------------------------------------------------------
// MÉDECIN — /messages/doctor/* (kind=medical de SA cohorte uniquement)
// ------------------------------------------------------------------

/** Ids des patients assignés au médecin connecté (scopés tenant). */
async function cohortPatientIds(c: any): Promise<string[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('assigned_doctor_id', c.get('user').id)
    .eq('tenant_id', c.get('tenantId'));
  if (error) {
    console.error('[MESSAGING] cohort error:', error.message);
    return [];
  }
  return (data ?? []).map((p) => p.id);
}

/** Conversation médicale d'un patient de la cohorte du médecin, sinon null. */
async function getDoctorConversation(c: any, conversationId: string) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('tenant_id', c.get('tenantId'))
    .eq('kind', 'medical')
    .maybeSingle();
  if (!conversation) return null;

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', conversation.patient_id)
    .eq('assigned_doctor_id', c.get('user').id)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();

  return patient ? conversation : null;
}

app.get('/messages/doctor/conversations', async (c) => {
  const ids = await cohortPatientIds(c);
  if (ids.length === 0) return c.json({ conversations: [] });

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .in('patient_id', ids)
    .eq('tenant_id', c.get('tenantId'))
    .eq('kind', 'medical')
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (error) return c.json({ error: error.message }, 500);

  const conversations = data ?? [];
  const userId = c.get('user').id;
  const [{ lastByConv, unreadByConv }, names] = await Promise.all([
    summarizeConversations(conversations.map((cv) => cv.id), userId),
    patientNames([...new Set(conversations.map((cv) => cv.patient_id))]),
  ]);

  return c.json({
    conversations: conversations.map((cv) =>
      serializeConversation(
        cv,
        lastByConv.get(cv.id) ?? null,
        unreadByConv.get(cv.id) ?? 0,
        names.get(cv.patient_id) ?? '—',
      ),
    ),
  });
});

app.get('/messages/doctor/conversations/:id/messages', async (c) => {
  const conversation = await getDoctorConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return listMessagesAndMarkRead(c, conversation);
});

app.post('/messages/doctor/conversations/:id/messages', async (c) => {
  const conversation = await getDoctorConversation(c, c.req.param('id'));
  if (!conversation) return c.json({ error: 'Conversation introuvable' }, 404);
  return postMessage(c, conversation);
});

export default app;
