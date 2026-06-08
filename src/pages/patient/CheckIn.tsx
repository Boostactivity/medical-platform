/**
 * CARE CHECK-IN PATIENT — "Comment vous sentez-vous aujourd'hui ?"
 * (audience 50-70 ans, démarrage de thérapie PPC).
 *
 * Règles dures :
 *   - Vouvoiement, polices >= 16px, aucun emoji.
 *   - ANTI-SHAME ABSOLU : l'endroit le plus sensible de la plateforme.
 *     Aucun score, aucune moyenne, aucun jugement, aucune comparaison.
 *     3 questions douces, réponses par boutons (jamais de pavé à écrire),
 *     note libre OPTIONNELLE, merci bienveillant.
 *   - Cadence gérée par le serveur : quotidien J1-J28 puis semestriel.
 *     Si déjà répondu aujourd'hui → récap en mots (jamais en chiffres).
 *
 * Données réelles via src/utils/api.ts → routes /patient/checkin*.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../utils/api';

interface CheckinView {
  id: string;
  checkin_date: string;
  day_index: number;
  mood: number;
  mask_comfort: number;
  sleep_feeling: number;
  free_note: string | null;
  created_at: string;
}

interface TodayResponse {
  due: boolean;
  phase: 'daily' | 'semiannual';
  day_index: number;
  today: CheckinView | null;
  last: CheckinView | null;
}

// 5 niveaux, libellés sobres — jamais de chiffres affichés au patient
const LEVEL_LABELS = ['Difficile', 'Plutôt difficile', 'Moyen', 'Plutôt bien', 'Très bien'];

const QUESTIONS: Array<{ key: 'mood' | 'mask_comfort' | 'sleep_feeling'; label: string; hint: string }> = [
  {
    key: 'mood',
    label: 'Comment vous sentez-vous aujourd\'hui ?',
    hint: 'Votre ressenti général, tout simplement.',
  },
  {
    key: 'mask_comfort',
    label: 'Comment se passe le port de votre masque ?',
    hint: 'Il est normal d\'avoir besoin d\'un temps d\'adaptation.',
  },
  {
    key: 'sleep_feeling',
    label: 'Comment dormez-vous en ce moment ?',
    hint: 'Votre impression au réveil, sans chercher la précision.',
  },
];

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso.split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso ?? '';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Récap d'un check-in en mots (jamais de score). */
function CheckinRecap({ checkin }: { checkin: CheckinView }) {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q) => (
        <div key={q.key} className="rounded-2xl border border-[#E8E5DE] px-4 py-3">
          <p className="text-base text-[#5C5C5C]">{q.label}</p>
          <p className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
            {LEVEL_LABELS[(checkin[q.key] ?? 1) - 1] ?? '—'}
          </p>
        </div>
      ))}
      {checkin.free_note && (
        <div className="rounded-2xl border border-[#E8E5DE] px-4 py-3">
          <p className="text-base text-[#5C5C5C]">Votre mot pour l'équipe</p>
          <p className="text-base text-[#1A1A1A] leading-relaxed">{checkin.free_note}</p>
        </div>
      )}
    </div>
  );
}

export function CheckIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<TodayResponse | null>(null);

  // Formulaire
  const [answers, setAnswers] = useState<Record<string, number | null>>({
    mood: null,
    mask_comfort: null,
    sleep_feeling: null,
  });
  const [freeNote, setFreeNote] = useState('');
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/patient/checkin/today');
      setInfo(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/patient/connexion');
        return;
      }
      toast.error('Cette page n\'est pas accessible pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (answers.mood == null || answers.mask_comfort == null || answers.sleep_feeling == null) {
      toast.error('Merci de répondre aux trois questions.');
      return;
    }
    setSending(true);
    try {
      await api.post('/patient/checkin', {
        mood: answers.mood,
        mask_comfort: answers.mask_comfort,
        sleep_feeling: answers.sleep_feeling,
        free_note: freeNote.trim() || undefined,
      });
      setJustSent(true);
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Déjà répondu aujourd'hui (autre onglet) : on recharge le récap
        setJustSent(false);
        load();
        return;
      }
      toast.error('L\'envoi n\'a pas fonctionné. Réessayez dans un instant.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">Un instant…</p>
        </div>
      </div>
    );
  }

  const doneToday = !!info?.today;
  const showForm = !!info?.due && !doneToday && !justSent;

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
          <span className="text-lg text-[#1A1A1A]">Comment ça va ?</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Merci après envoi */}
        {justSent && (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm text-center">
            <HeartHandshake className="w-10 h-10 text-[#007AFF] mx-auto mb-3" />
            <h1 className="text-xl text-[#1A1A1A] mb-2">Merci.</h1>
            <p className="text-base text-[#5C5C5C] leading-relaxed max-w-md mx-auto">
              Votre équipe lit ces réponses et reviendra vers vous si besoin.
              Prenez soin de vous.
            </p>
            <Link
              to="/patient/dashboard"
              className="inline-flex items-center justify-center h-12 px-6 mt-6 rounded-xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors"
              style={{ fontWeight: 500 }}
            >
              Retour à mon espace
            </Link>
          </section>
        )}

        {/* Formulaire du jour */}
        {showForm && (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <h1 className="text-xl text-[#1A1A1A] mb-1">Comment vous sentez-vous aujourd'hui ?</h1>
            <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
              Trois questions, quelques secondes. Il n'y a pas de bonne ou de
              mauvaise réponse : ces nouvelles aident simplement votre équipe à
              vous accompagner.
            </p>

            <div className="space-y-6">
              {QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p className="text-base text-[#1A1A1A] mb-1" style={{ fontWeight: 500 }}>
                    {q.label}
                  </p>
                  <p className="text-base text-[#5C5C5C] mb-3">{q.hint}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={q.label}>
                    {LEVEL_LABELS.map((label, index) => {
                      const value = index + 1;
                      const selected = answers[q.key] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: value }))}
                          className={`min-h-12 rounded-2xl border px-3 py-2.5 text-base transition-colors ${
                            selected
                              ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#1A1A1A]'
                              : 'border-[#E8E5DE] text-[#5C5C5C] hover:border-[#007AFF]/40'
                          }`}
                          style={selected ? { fontWeight: 500 } : undefined}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Note libre optionnelle */}
              <div>
                <label
                  htmlFor="checkin-note"
                  className="block text-base text-[#1A1A1A] mb-1"
                  style={{ fontWeight: 500 }}
                >
                  Un mot pour votre équipe ? (facultatif)
                </label>
                <p className="text-base text-[#5C5C5C] mb-3">
                  Une gêne, une question, ou rien du tout : c'est vous qui voyez.
                </p>
                <textarea
                  id="checkin-note"
                  value={freeNote}
                  onChange={(e) => setFreeNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Écrivez ici si vous le souhaitez."
                  className="w-full rounded-xl border border-[#E8E5DE] bg-white px-4 py-3 text-base text-[#1A1A1A] placeholder:text-[#9A9890] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <button
                onClick={submit}
                disabled={sending}
                className="w-full h-14 rounded-2xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
                style={{ fontWeight: 500 }}
              >
                {sending ? 'Envoi en cours…' : 'Envoyer mes réponses'}
              </button>
            </div>
          </section>
        )}

        {/* Déjà répondu aujourd'hui → récap */}
        {!justSent && doneToday && info?.today && (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <h1 className="text-xl text-[#1A1A1A] mb-1">Merci, c'est noté pour aujourd'hui.</h1>
            <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
              Voici ce que vous nous avez partagé. Votre équipe lit ces réponses
              et reviendra vers vous si besoin.
            </p>
            <CheckinRecap checkin={info.today} />
          </section>
        )}

        {/* Rien à faire aujourd'hui (cadence semestrielle) */}
        {!justSent && !doneToday && !info?.due && (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <h1 className="text-xl text-[#1A1A1A] mb-1">Pas de questions aujourd'hui.</h1>
            <p className="text-base text-[#5C5C5C] leading-relaxed">
              Nous prendrons de vos nouvelles de temps en temps. Si quelque chose
              vous gêne d'ici là, votre équipe reste joignable à tout moment
              depuis la messagerie ou par téléphone.
            </p>
            {info?.last && (
              <div className="mt-5">
                <p className="text-base text-[#5C5C5C] mb-3">
                  Vos dernières nouvelles, le {formatDateFr(info.last.checkin_date)} :
                </p>
                <CheckinRecap checkin={info.last} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
