/**
 * PORTAIL PATIENT — écran-pivot matinal (audience 50-70 ans, PPC).
 *
 * Règles dures (research/15 §VIII + research/12) :
 *   - Vouvoiement, lecture simple, jargon défini entre parenthèses.
 *   - ANTI-SHAME absolu : jamais "raté", "perdez", "série perdue".
 *   - Polices ≥ 16px partout, contraste AA renforcé.
 *   - AUCUNE donnée démo : si l'API échoue → état vide honnête + toast.
 *     (L'ancien fallback "Jean Dupont" est PURGÉ.)
 *   - Mobile-first : la majorité des patients ouvrent sur téléphone.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Upload, ShoppingBag, CalendarClock, FileText, MessageCircle, GraduationCap, Users, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../utils/api';
import { createClient } from '../utils/supabase/client';
import { ScoreHero, type PatientScore } from '../components/patient/ScoreHero';
import { ScoreHistoryTabs } from '../components/patient/ScoreHistoryTabs';
import { ObservanceCard, type ObservanceSummary } from '../components/patient/ObservanceCard';
import { ProgressGarden, type GamificationData } from '../components/patient/ProgressGarden';
import { ProblemDialog } from '../components/patient/ProblemDialog';
import { PreferencesCard, type PatientPreferences } from '../components/patient/PreferencesCard';

const DEFAULT_PREFERENCES: PatientPreferences = {
  streaks_enabled: false,
  notifications_daily_max: 1,
  notification_channel: 'app',
  dark_mode: false,
};

export function DashboardPatient() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [score, setScore] = useState<PatientScore | null>(null);
  const [observance, setObservance] = useState<ObservanceSummary | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [preferences, setPreferences] = useState<PatientPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/patient/connexion');
        return;
      }

      // Prénom depuis la session (pas d'appel réseau supplémentaire)
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const name: string = session?.user?.user_metadata?.name ?? '';
        if (!cancelled && name) setFirstName(name.split(' ')[0]);
      } catch {
        // Pas bloquant : le message du matin fonctionne sans prénom
      }

      // Chargement parallèle — chaque section échoue indépendamment :
      // PAS de fallback démo, un état vide honnête à la place.
      const results = await Promise.allSettled([
        api.get('/patient/score'),
        api.get('/patient/observance'),
        api.get('/patient/gamification'),
        api.get('/patient/preferences'),
      ]);

      if (cancelled) return;

      const unauthorized = results.some(
        (r) => r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401,
      );
      if (unauthorized) {
        localStorage.removeItem('access_token');
        navigate('/patient/connexion');
        return;
      }

      const [scoreRes, observanceRes, gamificationRes, preferencesRes] = results;

      if (scoreRes.status === 'fulfilled') setScore(scoreRes.value?.score ?? null);
      if (observanceRes.status === 'fulfilled') setObservance(observanceRes.value ?? null);
      if (gamificationRes.status === 'fulfilled') setGamification(gamificationRes.value ?? null);
      if (preferencesRes.status === 'fulfilled' && preferencesRes.value?.preferences) {
        setPreferences(preferencesRes.value.preferences);
      }

      const failures = results.filter((r) => r.status === 'rejected').length;
      if (failures === results.length) {
        setLoadError(true);
        toast.error('Vos données ne sont pas accessibles pour le moment. Réessayez dans quelques minutes.');
      } else if (failures > 0) {
        toast.error('Une partie de vos données n\'a pas pu être chargée.');
      }

      setLoading(false);
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    navigate('/patient/connexion');
  };

  // Quand le patient active/désactive sa série, la section progression suit
  const handlePreferencesChange = (next: PatientPreferences) => {
    setPreferences(next);
    setGamification((g) =>
      g
        ? {
            ...g,
            streaks_enabled: next.streaks_enabled,
            current_streak: next.streaks_enabled ? (g.current_streak ?? 0) : null,
            longest_streak: next.streaks_enabled ? (g.longest_streak ?? 0) : null,
          }
        : g,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">Chargement de vos données…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      {/* En-tête simple et stable */}
      <header className="bg-white border-b border-[#E8E5DE] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center">
              <span className="text-white text-lg" style={{ fontWeight: 500 }}>M</span>
            </div>
            <span className="text-lg text-[#1A1A1A]">Mon espace</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 h-11 px-4 rounded-xl text-base text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {loadError ? (
          /* État vide HONNÊTE — jamais de fausses données */
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-8 text-center shadow-sm">
            <h1 className="text-2xl text-[#1A1A1A] mb-3">
              {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
            </h1>
            <p className="text-lg text-[#5C5C5C] leading-relaxed max-w-md mx-auto">
              Vos données ne sont pas accessibles pour le moment.
              Ce n'est pas de votre faute : réessayez dans quelques minutes,
              ou contactez votre prestataire si cela continue.
            </p>
            <div className="mt-6 max-w-sm mx-auto">
              <ProblemDialog />
            </div>
          </section>
        ) : (
          <>
            {/* 1. Écran-pivot : score de la nuit + breakdown transparent */}
            <ScoreHero score={score} firstName={firstName} />

            {/* 2. Bouton problème — toujours à portée de main */}
            <ProblemDialog />

            {/* 3. Observance réglementaire en langage simple */}
            <ObservanceCard observance={observance} />

            {/* 4. Historique 7 / 30 / 90 / 365 jours */}
            <ScoreHistoryTabs />

            {/* 5. Progression cumulée + plante + badges sobres */}
            <ProgressGarden data={gamification} />

            {/* 6. Préférences (streaks opt-in, rappels) */}
            <PreferencesCard preferences={preferences} onChange={handlePreferencesChange} />

            {/* 7. Mes services — accès à toutes les fonctions patient */}
            <div>
              <h2 className="text-lg text-[#1A1A1A] mb-3">Mes services</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { to: '/patient/check-in', icon: HeartPulse, label: 'Comment je vais' },
                  { to: '/patient/commandes', icon: ShoppingBag, label: 'Mes commandes' },
                  { to: '/patient/rendez-vous', icon: CalendarClock, label: 'Mes rendez-vous' },
                  { to: '/patient/messages', icon: MessageCircle, label: 'Messages' },
                  { to: '/patient/documents', icon: FileText, label: 'Mes documents' },
                  { to: '/patient/ecole-du-sommeil', icon: GraduationCap, label: 'École du sommeil' },
                  { to: '/patient/communaute', icon: Users, label: 'Communauté' },
                  { to: '/patient/mes-donnees', icon: Upload, label: 'Mes données machine' },
                ].map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-2xl bg-white border border-[#E8E5DE] p-4 flex flex-col items-center justify-center gap-2 text-center hover:border-[#007AFF]/40 transition-colors shadow-sm min-h-[96px]"
                  >
                    <Icon className="w-6 h-6 text-[#007AFF]" />
                    <span className="text-base text-[#1A1A1A] leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
