/**
 * SLEEP SCHOOL — éducation thérapeutique structurée (audience 50-70 ans).
 *
 * Règles dures :
 *   - Vouvoiement, polices ≥ 16px, ANTI-SHAME, aucun emoji.
 *   - Contenu factuel et générique (servi par le backend), jamais de
 *     conseil médical individualisé.
 *   - Quiz bienveillant : jamais "FAUX !" — toujours
 *     "Pas tout à fait — [explication]". Refaire une leçon est permis
 *     et jamais présenté comme un échec.
 *   - Markdown rendu par un parseur minimal maison (##, ###, listes -,
 *     paragraphes, **gras**) — pas de lib.
 *
 * Données réelles via src/utils/api.ts → routes /patient/education/*.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../utils/api';

// ------------------------------------------------------------------
// Types (réponses API)
// ------------------------------------------------------------------

interface LessonSummary {
  id: string;
  title: string;
  display_order: number;
  completed: boolean;
  completed_at: string | null;
  quiz_score: number | null;
}

interface EducationModule {
  id: string;
  title: string;
  description: string | null;
  lessons_count: number;
  completed_count: number;
  lessons: LessonSummary[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface LessonDetail {
  lesson: {
    id: string;
    module_id: string;
    module_title: string;
    title: string;
    body_md: string;
    video_url: string | null;
  };
  questions: QuizQuestion[];
  next_lesson_id: string | null;
  progress: { completed_at: string; quiz_score: number | null } | null;
}

// ------------------------------------------------------------------
// Markdown minimal maison : ## / ### titres, - listes, paragraphes,
// **gras** inline. Gros texte (≥ 16px) pour la lisibilité.
// ------------------------------------------------------------------

function renderInline(text: string): ReactNode[] {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ fontWeight: 600 }}>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function MarkdownBody({ md }: { md: string }) {
  const lines = md.split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={key} className="text-lg text-[#1A1A1A] leading-relaxed mb-4">
        {renderInline(paragraph.join(' '))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-6 space-y-2 mb-4">
        {list.map((item, i) => (
          <li key={i} className="text-lg text-[#1A1A1A] leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const key = `b${index}`;

    if (line.startsWith('### ')) {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      blocks.push(
        <h3 key={key} className="text-lg text-[#1A1A1A] mt-6 mb-2" style={{ fontWeight: 600 }}>
          {renderInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      blocks.push(
        <h2 key={key} className="text-xl text-[#1A1A1A] mt-7 mb-3" style={{ fontWeight: 600 }}>
          {renderInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith('- ')) {
      flushParagraph(`p${key}`);
      list.push(line.slice(2));
    } else if (line === '') {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
    } else {
      flushList(`l${key}`);
      paragraph.push(line);
    }
  });
  flushParagraph('p-end');
  flushList('l-end');

  return <div>{blocks}</div>;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Phrase de fin de quiz, toujours encourageante. */
function quizSummarySentence(correct: number, total: number): string {
  if (total === 0) return '';
  if (correct === total) {
    return total === 1
      ? 'Bravo, vous avez répondu juste à la question.'
      : `Bravo, vous avez répondu juste aux ${total} questions.`;
  }
  return `Vous avez répondu juste à ${correct} question${correct > 1 ? 's' : ''} sur ${total}. L'important est d'avoir pris ce temps : vous pourrez refaire le quiz quand vous voulez.`;
}

// ------------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------------

export function SleepSchool() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<EducationModule[]>([]);

  // Vue leçon
  const [lessonLoading, setLessonLoading] = useState(false);
  const [detail, setDetail] = useState<LessonDetail | null>(null);

  // Quiz : une question à la fois
  const [quizStarted, setQuizStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Array<{ question_id: string; answer_index: number }>>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);

  const handleUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/patient/connexion');
        return true;
      }
      return false;
    },
    [navigate],
  );

  const loadModules = useCallback(async () => {
    try {
      const data = await api.get('/patient/education/modules');
      setModules(data?.modules ?? []);
    } catch (err) {
      if (handleUnauthorized(err)) return;
      toast.error('Vos cours ne sont pas accessibles pour le moment. Réessayez dans quelques minutes.');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const resetQuizState = () => {
    setQuizStarted(false);
    setQuestionIndex(0);
    setSelected(null);
    setAnswered(false);
    setAnswers([]);
    setCorrectCount(0);
    setLessonDone(false);
  };

  const openLesson = async (lessonId: string) => {
    setLessonLoading(true);
    resetQuizState();
    try {
      const data = await api.get(`/patient/education/lessons/${lessonId}`);
      setDetail(data);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (handleUnauthorized(err)) return;
      toast.error('Cette leçon ne s\'ouvre pas pour le moment. Réessayez dans quelques minutes.');
    } finally {
      setLessonLoading(false);
    }
  };

  const backToList = () => {
    setDetail(null);
    resetQuizState();
    window.scrollTo({ top: 0 });
  };

  const validateAnswer = () => {
    if (detail == null || selected == null) return;
    const question = detail.questions[questionIndex];
    setAnswers((prev) => [...prev, { question_id: question.id, answer_index: selected }]);
    if (selected === question.correct_index) setCorrectCount((n) => n + 1);
    setAnswered(true);
  };

  const nextQuestion = () => {
    setSelected(null);
    setAnswered(false);
    setQuestionIndex((i) => i + 1);
  };

  const completeLesson = async (quizAnswers: Array<{ question_id: string; answer_index: number }>) => {
    if (!detail) return;
    setCompleting(true);
    try {
      await api.post(`/patient/education/lessons/${detail.lesson.id}/complete`, {
        quiz_answers: quizAnswers,
      });
      setLessonDone(true);
      toast.success('Leçon enregistrée. Merci d\'avoir pris ce temps pour vous.');
      // Rafraîchit la progression des cartes en arrière-plan
      loadModules();
    } catch (err) {
      if (handleUnauthorized(err)) return;
      toast.error('L\'enregistrement n\'a pas fonctionné. Réessayez ou appelez votre prestataire.');
    } finally {
      setCompleting(false);
    }
  };

  // ----------------------------------------------------------------
  // États de chargement
  // ----------------------------------------------------------------

  if (loading || lessonLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">
            {lessonLoading ? 'Ouverture de la leçon…' : 'Chargement de vos cours…'}
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // VUE LEÇON
  // ----------------------------------------------------------------

  if (detail) {
    const { lesson, questions, next_lesson_id: nextLessonId, progress } = detail;
    const hasQuiz = questions.length > 0;
    const quizFinished = hasQuiz && questionIndex >= questions.length;
    const question = hasQuiz && !quizFinished ? questions[questionIndex] : null;

    return (
      <div className="min-h-screen bg-[#FAFAF7] text-base">
        <header className="bg-white border-b border-[#E8E5DE] sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={backToList}
              className="flex items-center gap-2 h-11 px-3 rounded-xl text-base text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Tous les cours</span>
            </button>
            <span className="text-lg text-[#1A1A1A] truncate">{lesson.module_title}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          {/* Corps de la leçon */}
          <article className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <p className="text-base text-[#5C5C5C] mb-1">{lesson.module_title}</p>
            <h1 className="text-2xl text-[#1A1A1A] mb-2" style={{ fontWeight: 600 }}>
              {lesson.title}
            </h1>
            {progress && (
              <p className="text-base text-[#5C5C5C] mb-2">
                Vous avez déjà terminé cette leçon le {formatDateFr(progress.completed_at)}. Vous
                pouvez la relire ou refaire le quiz, autant de fois que vous voulez.
              </p>
            )}
            <MarkdownBody md={lesson.body_md} />
          </article>

          {/* Quiz : une question à la fois */}
          {hasQuiz && !lessonDone && (
            <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
              {!quizStarted ? (
                <>
                  <h2 className="text-xl text-[#1A1A1A] mb-2" style={{ fontWeight: 600 }}>
                    Petit quiz pour retenir l'essentiel
                  </h2>
                  <p className="text-lg text-[#5C5C5C] leading-relaxed mb-5">
                    {questions.length === 1
                      ? 'Une seule question, sans piège. Prenez votre temps.'
                      : `${questions.length} questions, sans piège. Prenez votre temps.`}
                  </p>
                  <button
                    onClick={() => setQuizStarted(true)}
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Commencer le quiz
                  </button>
                </>
              ) : question ? (
                <>
                  <p className="text-base text-[#5C5C5C] mb-3">
                    Question {questionIndex + 1} sur {questions.length}
                  </p>
                  <h2 className="text-xl text-[#1A1A1A] mb-5 leading-relaxed" style={{ fontWeight: 600 }}>
                    {question.question}
                  </h2>
                  <div className="space-y-3 mb-5">
                    {question.options.map((option, index) => {
                      const isSelected = selected === index;
                      const isCorrect = index === question.correct_index;
                      let className =
                        'w-full text-left rounded-2xl border px-5 py-4 text-lg leading-relaxed transition-colors ';
                      if (!answered) {
                        className += isSelected
                          ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#1A1A1A]'
                          : 'border-[#E8E5DE] text-[#1A1A1A] hover:border-[#007AFF]/40';
                      } else if (isCorrect) {
                        className += 'border-emerald-300 bg-emerald-50 text-emerald-900';
                      } else if (isSelected) {
                        className += 'border-[#E8B84B]/60 bg-[#FFF8E8] text-[#1A1A1A]';
                      } else {
                        className += 'border-[#E8E5DE] text-[#5C5C5C]';
                      }
                      return (
                        <button
                          key={index}
                          onClick={() => !answered && setSelected(index)}
                          disabled={answered}
                          className={className}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {!answered ? (
                    <button
                      onClick={validateAnswer}
                      disabled={selected == null}
                      className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors disabled:opacity-50"
                      style={{ fontWeight: 500 }}
                    >
                      Valider ma réponse
                    </button>
                  ) : (
                    <>
                      <div
                        className={`rounded-2xl px-5 py-4 mb-5 ${
                          selected === question.correct_index
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-[#FFF8E8] border border-[#E8B84B]/40'
                        }`}
                      >
                        <p className="text-lg text-[#1A1A1A] leading-relaxed" style={{ fontWeight: 600 }}>
                          {selected === question.correct_index ? 'Bonne réponse.' : 'Pas tout à fait.'}
                        </p>
                        {question.explanation && (
                          <p className="text-lg text-[#1A1A1A] leading-relaxed mt-1">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                      {questionIndex < questions.length - 1 ? (
                        <button
                          onClick={nextQuestion}
                          className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors"
                          style={{ fontWeight: 500 }}
                        >
                          Question suivante
                        </button>
                      ) : (
                        <button
                          onClick={nextQuestion}
                          className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors"
                          style={{ fontWeight: 500 }}
                        >
                          Voir le résultat
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl text-[#1A1A1A] mb-2" style={{ fontWeight: 600 }}>
                    Quiz terminé
                  </h2>
                  <p className="text-lg text-[#1A1A1A] leading-relaxed mb-5">
                    {quizSummarySentence(correctCount, questions.length)}
                  </p>
                  <button
                    onClick={() => completeLesson(answers)}
                    disabled={completing}
                    className="w-full h-14 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors disabled:opacity-60"
                    style={{ fontWeight: 500 }}
                  >
                    {completing ? 'Enregistrement…' : 'Leçon terminée'}
                  </button>
                </>
              )}
            </section>
          )}

          {/* Pas de quiz : bouton terminé directement */}
          {!hasQuiz && !lessonDone && (
            <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
              <p className="text-lg text-[#5C5C5C] leading-relaxed mb-5">
                Quand vous avez fini votre lecture, appuyez sur le bouton ci-dessous.
              </p>
              <button
                onClick={() => completeLesson([])}
                disabled={completing}
                className="w-full h-14 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors disabled:opacity-60"
                style={{ fontWeight: 500 }}
              >
                {completing ? 'Enregistrement…' : 'Leçon terminée'}
              </button>
            </section>
          )}

          {/* Après enregistrement : navigation douce */}
          {lessonDone && (
            <section className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl text-[#1A1A1A] mb-1" style={{ fontWeight: 600 }}>
                    Leçon enregistrée
                  </h2>
                  <p className="text-lg text-[#5C5C5C] leading-relaxed">
                    Vous pouvez continuer maintenant ou revenir plus tard : votre progression est
                    gardée en mémoire.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {nextLessonId && (
                  <button
                    onClick={() => openLesson(nextLessonId)}
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0066D6] transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Leçon suivante
                  </button>
                )}
                <button
                  onClick={backToList}
                  className="w-full sm:w-auto h-14 px-8 rounded-2xl border border-[#E8E5DE] bg-white text-lg text-[#1A1A1A] hover:border-[#007AFF]/40 transition-colors"
                >
                  Retour aux cours
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // VUE LISTE — modules en cartes avec barre de progression
  // ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      <header className="bg-white border-b border-[#E8E5DE] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            to="/patient/dashboard"
            className="flex items-center gap-2 h-11 px-3 rounded-xl text-base text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Mon espace</span>
          </Link>
          <span className="text-lg text-[#1A1A1A]">École du sommeil</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-2xl text-[#1A1A1A] mb-1" style={{ fontWeight: 600 }}>
                Mieux comprendre votre traitement
              </h1>
              <p className="text-lg text-[#5C5C5C] leading-relaxed">
                Des leçons courtes, à lire à votre rythme. Vous pouvez vous arrêter quand vous
                voulez et reprendre plus tard : votre progression est gardée en mémoire. Pour
                toute question sur votre santé, parlez-en à votre médecin.
              </p>
            </div>
          </div>
        </section>

        {modules.length === 0 ? (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm text-center">
            <BookOpen className="w-8 h-8 text-[#9A9890] mx-auto mb-2" />
            <p className="text-lg text-[#5C5C5C]">
              Aucun cours n'est disponible pour le moment. Revenez bientôt.
            </p>
          </section>
        ) : (
          modules.map((module) => {
            const percent =
              module.lessons_count > 0
                ? Math.round((module.completed_count / module.lessons_count) * 100)
                : 0;
            return (
              <section
                key={module.id}
                className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm"
              >
                <h2 className="text-xl text-[#1A1A1A] mb-1" style={{ fontWeight: 600 }}>
                  {module.title}
                </h2>
                {module.description && (
                  <p className="text-lg text-[#5C5C5C] leading-relaxed mb-4">{module.description}</p>
                )}

                {/* Barre de progression */}
                <div className="mb-2">
                  <div className="h-2.5 rounded-full bg-[#F2F0EB] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#007AFF] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <p className="text-base text-[#5C5C5C] mb-5">
                  {module.completed_count === 0
                    ? `${module.lessons_count} leçon${module.lessons_count > 1 ? 's' : ''} à découvrir`
                    : module.completed_count === module.lessons_count
                      ? 'Module terminé — vous pouvez relire les leçons quand vous voulez'
                      : `${module.completed_count} leçon${module.completed_count > 1 ? 's' : ''} terminée${module.completed_count > 1 ? 's' : ''} sur ${module.lessons_count}`}
                </p>

                <ul className="space-y-3">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button
                        onClick={() => openLesson(lesson.id)}
                        className="w-full flex items-center gap-3 rounded-2xl border border-[#E8E5DE] bg-[#FAFAF7] px-4 py-4 text-left hover:border-[#007AFF]/40 transition-colors"
                      >
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            lesson.completed
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-white border border-[#E8E5DE] text-[#9A9890]'
                          }`}
                        >
                          {lesson.completed ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <span className="text-base tabular-nums">{lesson.display_order}</span>
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-lg text-[#1A1A1A] leading-snug">
                            {lesson.title}
                          </span>
                          {lesson.completed && (
                            <span className="block text-base text-[#5C5C5C]">
                              Terminée le {formatDateFr(lesson.completed_at)}
                              {lesson.quiz_score != null ? ` — quiz : ${lesson.quiz_score}%` : ''}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="w-5 h-5 text-[#9A9890] shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
