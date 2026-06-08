/**
 * Routes SLEEP SCHOOL — éducation thérapeutique structurée (patients PPC).
 * À monter dans index.tsx : `app.route(prefix, educationRoutes);`
 * (paths /patient/education/*, /pro-education/*).
 *
 * Règles dures :
 *   - Middlewares scopés PAR CHEMIN (jamais use('*')) : monté au préfixe
 *     racine, un '*' avalerait les routes des sub-apps montées après.
 *   - Le patient n'accède QU'À ses propres données :
 *     user.id (auth) → patients.user_id → patients.id, filtré tenant.
 *   - Contenu : modules tenant_id NULL = contenu plateforme partagé,
 *     sinon contenu custom du PSAD. On ne sert que published = true.
 *   - Le score du quiz est TOUJOURS recalculé côté serveur au moment
 *     du POST complete (les réponses correctes envoyées au front ne
 *     servent qu'au feedback immédiat — aucun enjeu de triche, c'est
 *     de l'éducation, pas un examen).
 *
 * Côté patient (requireRole('patient')) :
 * - GET  /patient/education/modules              : modules + leçons + progression agrégée
 * - GET  /patient/education/lessons/:id          : leçon (body_md) + quiz + progression
 * - POST /patient/education/lessons/:id/complete : { quiz_answers } → score + upsert progress
 *
 * Côté pro (requireRole('admin','prestataire')) :
 * - GET  /pro-education/overview : taux de complétion par module sur les patients du tenant
 *
 * Schéma : migration 110 (education_modules, education_lessons,
 * education_quiz_questions, patient_education_progress).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Scopé par chemin (pas '*') : monté au préfixe racine, un '*' avalerait
// les routes des sub-apps montées après (bug connu d'interception).
app.use('/patient/education/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/pro-education/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

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

/** Filtre Supabase : contenu plateforme (tenant NULL) OU du tenant courant. */
function tenantOrPlatform(tenantId: string): string {
  return `tenant_id.is.null,tenant_id.eq.${tenantId}`;
}

/**
 * Charge une leçon publiée + son module publié, en vérifiant que le
 * module est visible pour le tenant (plateforme ou tenant courant).
 */
async function fetchVisibleLesson(lessonId: string, tenantId: string) {
  const { data: lesson, error } = await supabase
    .from('education_lessons')
    .select('id, module_id, title, body_md, video_url, display_order')
    .eq('id', lessonId)
    .eq('published', true)
    .maybeSingle();
  if (error) return { error: error.message, lesson: null, module: null };
  if (!lesson) return { error: null, lesson: null, module: null };

  const { data: module, error: modError } = await supabase
    .from('education_modules')
    .select('id, tenant_id, title, published')
    .eq('id', lesson.module_id)
    .eq('published', true)
    .or(tenantOrPlatform(tenantId))
    .maybeSingle();
  if (modError) return { error: modError.message, lesson: null, module: null };
  if (!module) return { error: null, lesson: null, module: null };

  return { error: null, lesson, module };
}

// ==================================================================
// PATIENT — MODULES + PROGRESSION
// ==================================================================

// GET /patient/education/modules — modules publiés (plateforme + tenant)
// avec leurs leçons publiées et la progression agrégée du patient.
app.get('/patient/education/modules', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: modules, error: modError } = await supabase
    .from('education_modules')
    .select('id, title, description, display_order')
    .eq('published', true)
    .or(tenantOrPlatform(tenantId))
    .order('display_order', { ascending: true });
  if (modError) return c.json({ error: modError.message }, 500);

  const moduleIds = (modules ?? []).map((m) => m.id);
  let lessons: any[] = [];
  if (moduleIds.length > 0) {
    const { data, error } = await supabase
      .from('education_lessons')
      .select('id, module_id, title, display_order')
      .in('module_id', moduleIds)
      .eq('published', true)
      .order('display_order', { ascending: true });
    if (error) return c.json({ error: error.message }, 500);
    lessons = data ?? [];
  }

  // Progression : si le dossier patient n'existe pas encore, on sert
  // quand même le contenu (progression vide) — pas de mur d'erreur.
  const progressByLesson = new Map<string, { completed_at: string; quiz_score: number | null }>();
  const patient = await resolvePatient(c);
  if (patient && lessons.length > 0) {
    const { data: progress, error } = await supabase
      .from('patient_education_progress')
      .select('lesson_id, completed_at, quiz_score')
      .eq('patient_id', patient.id)
      .in('lesson_id', lessons.map((l) => l.id));
    if (error) return c.json({ error: error.message }, 500);
    for (const row of progress ?? []) {
      progressByLesson.set(row.lesson_id, {
        completed_at: row.completed_at,
        quiz_score: row.quiz_score,
      });
    }
  }

  const lessonsByModule = new Map<string, any[]>();
  for (const lesson of lessons) {
    if (!lessonsByModule.has(lesson.module_id)) lessonsByModule.set(lesson.module_id, []);
    lessonsByModule.get(lesson.module_id)!.push(lesson);
  }

  return c.json({
    modules: (modules ?? []).map((m) => {
      const moduleLessons = lessonsByModule.get(m.id) ?? [];
      const detailed = moduleLessons.map((l) => {
        const prog = progressByLesson.get(l.id);
        return {
          id: l.id,
          title: l.title,
          display_order: l.display_order,
          completed: Boolean(prog),
          completed_at: prog?.completed_at ?? null,
          quiz_score: prog?.quiz_score ?? null,
        };
      });
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        display_order: m.display_order,
        lessons_count: detailed.length,
        completed_count: detailed.filter((l) => l.completed).length,
        lessons: detailed,
      };
    }),
  });
});

// ==================================================================
// PATIENT — LEÇON + QUIZ
// ==================================================================

// GET /patient/education/lessons/:id — leçon complète + questions de quiz
// (correct_index/explanation inclus pour le feedback immédiat côté front ;
// le score officiel est recalculé serveur au POST complete) + progression.
app.get('/patient/education/lessons/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { error, lesson, module } = await fetchVisibleLesson(c.req.param('id'), tenantId);
  if (error) return c.json({ error }, 500);
  if (!lesson || !module) return c.json({ error: 'Leçon introuvable' }, 404);

  const { data: questions, error: qError } = await supabase
    .from('education_quiz_questions')
    .select('id, question, options, correct_index, explanation, display_order')
    .eq('lesson_id', lesson.id)
    .order('display_order', { ascending: true });
  if (qError) return c.json({ error: qError.message }, 500);

  // Leçon suivante du module (navigation douce)
  const { data: siblings } = await supabase
    .from('education_lessons')
    .select('id, display_order')
    .eq('module_id', module.id)
    .eq('published', true)
    .order('display_order', { ascending: true });
  const ordered = siblings ?? [];
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const nextLessonId = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;

  // Progression existante (le patient peut relire / refaire le quiz)
  let progress: { completed_at: string; quiz_score: number | null } | null = null;
  const patient = await resolvePatient(c);
  if (patient) {
    const { data } = await supabase
      .from('patient_education_progress')
      .select('completed_at, quiz_score')
      .eq('patient_id', patient.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle();
    if (data) progress = { completed_at: data.completed_at, quiz_score: data.quiz_score };
  }

  return c.json({
    lesson: {
      id: lesson.id,
      module_id: module.id,
      module_title: module.title,
      title: lesson.title,
      body_md: lesson.body_md,
      video_url: lesson.video_url,
    },
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      correct_index: q.correct_index,
      explanation: q.explanation,
    })),
    next_lesson_id: nextLessonId,
    progress,
  });
});

// POST /patient/education/lessons/:id/complete
// Body : { quiz_answers: [{ question_id, answer_index }] } (vide si pas de quiz)
// Score recalculé serveur (0-100), upsert progress (refaire le quiz = mise à jour).
app.post('/patient/education/lessons/:id/complete', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');
  const { error, lesson, module } = await fetchVisibleLesson(c.req.param('id'), tenantId);
  if (error) return c.json({ error }, 500);
  if (!lesson || !module) return c.json({ error: 'Leçon introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const rawAnswers = Array.isArray(body.quiz_answers) ? body.quiz_answers : [];
  const answerByQuestion = new Map<string, number>();
  for (const entry of rawAnswers) {
    if (entry && typeof entry.question_id === 'string' && Number.isInteger(entry.answer_index)) {
      answerByQuestion.set(entry.question_id, entry.answer_index);
    }
  }

  const { data: questions, error: qError } = await supabase
    .from('education_quiz_questions')
    .select('id, correct_index, explanation')
    .eq('lesson_id', lesson.id);
  if (qError) return c.json({ error: qError.message }, 500);

  const total = (questions ?? []).length;
  let correctCount = 0;
  const results = (questions ?? []).map((q) => {
    const answer = answerByQuestion.get(q.id);
    const correct = answer === q.correct_index;
    if (correct) correctCount += 1;
    return {
      question_id: q.id,
      answered: answer != null,
      correct,
      correct_index: q.correct_index,
      explanation: q.explanation,
    };
  });

  // Pas de quiz → leçon simplement lue, score NULL
  const score = total > 0 ? Math.round((correctCount / total) * 100) : null;

  const { data: progress, error: upsertError } = await supabase
    .from('patient_education_progress')
    .upsert(
      {
        tenant_id: tenantId,
        patient_id: patient.id,
        lesson_id: lesson.id,
        completed_at: new Date().toISOString(),
        quiz_score: score,
      },
      { onConflict: 'patient_id,lesson_id' },
    )
    .select('lesson_id, completed_at, quiz_score')
    .single();
  if (upsertError) {
    console.error('[EDUCATION] progress upsert error:', upsertError.message);
    return c.json({ error: 'Impossible d\'enregistrer votre progression, réessayez' }, 500);
  }

  return c.json({
    success: true,
    score,
    correct_count: correctCount,
    total,
    results,
    progress,
  });
});

// ==================================================================
// PRO — VUE D'ENSEMBLE
// ==================================================================

// GET /pro-education/overview — taux de complétion par module sur les
// patients du tenant : démarrés, terminés (toutes les leçons du module),
// taux de complétion (% des patients du tenant) + score moyen au quiz.
app.get('/pro-education/overview', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: modules, error: modError } = await supabase
    .from('education_modules')
    .select('id, title, description, display_order, tenant_id')
    .eq('published', true)
    .or(tenantOrPlatform(tenantId))
    .order('display_order', { ascending: true });
  if (modError) return c.json({ error: modError.message }, 500);

  const moduleIds = (modules ?? []).map((m) => m.id);
  let lessons: Array<{ id: string; module_id: string }> = [];
  if (moduleIds.length > 0) {
    const { data, error } = await supabase
      .from('education_lessons')
      .select('id, module_id')
      .in('module_id', moduleIds)
      .eq('published', true);
    if (error) return c.json({ error: error.message }, 500);
    lessons = data ?? [];
  }
  const moduleByLesson = new Map(lessons.map((l) => [l.id, l.module_id]));
  const lessonsCountByModule = new Map<string, number>();
  for (const l of lessons) {
    lessonsCountByModule.set(l.module_id, (lessonsCountByModule.get(l.module_id) ?? 0) + 1);
  }

  // Patients du tenant (dénominateur du taux de complétion)
  const { count: totalPatients, error: patError } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (patError) return c.json({ error: patError.message }, 500);

  // Progression du tenant sur les leçons visibles
  let progress: Array<{ patient_id: string; lesson_id: string; quiz_score: number | null }> = [];
  if (lessons.length > 0) {
    const { data, error } = await supabase
      .from('patient_education_progress')
      .select('patient_id, lesson_id, quiz_score')
      .eq('tenant_id', tenantId)
      .in('lesson_id', lessons.map((l) => l.id));
    if (error) return c.json({ error: error.message }, 500);
    progress = data ?? [];
  }

  // Agrégation par module : leçons terminées par patient + scores quiz
  const completedByModulePatient = new Map<string, Map<string, number>>();
  const quizScoresByModule = new Map<string, number[]>();
  for (const row of progress) {
    const moduleId = moduleByLesson.get(row.lesson_id);
    if (!moduleId) continue;
    if (!completedByModulePatient.has(moduleId)) completedByModulePatient.set(moduleId, new Map());
    const perPatient = completedByModulePatient.get(moduleId)!;
    perPatient.set(row.patient_id, (perPatient.get(row.patient_id) ?? 0) + 1);
    if (row.quiz_score != null) {
      if (!quizScoresByModule.has(moduleId)) quizScoresByModule.set(moduleId, []);
      quizScoresByModule.get(moduleId)!.push(row.quiz_score);
    }
  }

  const patientsTotal = totalPatients ?? 0;

  return c.json({
    total_patients: patientsTotal,
    modules: (modules ?? []).map((m) => {
      const lessonsCount = lessonsCountByModule.get(m.id) ?? 0;
      const perPatient = completedByModulePatient.get(m.id) ?? new Map<string, number>();
      const patientsStarted = perPatient.size;
      let patientsCompleted = 0;
      for (const completedLessons of perPatient.values()) {
        if (lessonsCount > 0 && completedLessons >= lessonsCount) patientsCompleted += 1;
      }
      const scores = quizScoresByModule.get(m.id) ?? [];
      const avgQuizScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null;
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        is_platform_content: m.tenant_id == null,
        lessons_count: lessonsCount,
        patients_started: patientsStarted,
        patients_completed: patientsCompleted,
        completion_rate: patientsTotal > 0
          ? Math.round((patientsCompleted / patientsTotal) * 100)
          : 0,
        avg_quiz_score: avgQuizScore,
      };
    }),
  });
});

export default app;
