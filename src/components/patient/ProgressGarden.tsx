/**
 * "Votre progression" — gamification douce et digne (50-70 ans).
 *
 * - Nuits cumulées : ne redescend JAMAIS (forgiveness, pattern Apple
 *   Activity Rings). Une nuit sans appareil n'efface rien.
 * - Plante SVG qui grandit avec les nuits cumulées (5 stades).
 * - Série discrète, SEULEMENT si activée dans les préférences (opt-in).
 *   Wording neutre : "12 nuits de bonne observance. Continuez à votre rythme."
 * - Badges sobres : jalons factuels, pas de confetti, pas de classement.
 *
 * Accent gamification : corail doux #CF7353 (rampe terracotta), jamais en masse.
 */

import { CheckCircle2 } from 'lucide-react';

export interface GamificationData {
  cumulative_nights: number;
  streaks_enabled: boolean;
  current_streak: number | null;
  longest_streak: number | null;
  badges: Array<{
    type: string;
    name: string;
    description: string;
    unlocked_at: string | null;
  }>;
  treatment_start_date: string | null;
}

/** 5 stades de croissance selon les nuits cumulées. */
function plantStage(nights: number): number {
  if (nights >= 180) return 5;
  if (nights >= 90) return 4;
  if (nights >= 30) return 3;
  if (nights >= 10) return 2;
  return 1;
}

const STAGE_LABELS: Record<number, string> = {
  1: 'Votre plante vient d\'être semée.',
  2: 'Une jeune pousse apparaît.',
  3: 'Votre plante prend des feuilles.',
  4: 'Votre plante fleurit.',
  5: 'Votre arbre est bien enraciné.',
};

/**
 * Plante stylisée — un seul SVG, parties révélées par stade.
 * Sobre : tiges vertes apaisées, fleurs corail discret.
 */
function PlantSvg({ stage }: { stage: number }) {
  const stem = '#18753C';
  const leaf = '#4CAF6E';
  const flower = '#CF7353';
  const pot = '#C45D40';

  return (
    <svg viewBox="0 0 120 140" className="w-32 h-36" aria-hidden="true">
      {/* Pot */}
      <path d="M40 112 L80 112 L74 134 L46 134 Z" fill={pot} opacity="0.85" />
      <rect x="36" y="106" width="48" height="8" rx="3" fill={pot} />

      {/* Stade 1 : graine / petite pousse */}
      <line x1="60" y1="106" x2="60" y2={stage >= 2 ? 70 : 92} stroke={stem} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="55" cy={stage >= 2 ? 88 : 94} rx="7" ry="4" fill={leaf} transform={`rotate(-30 55 ${stage >= 2 ? 88 : 94})`} />
      <ellipse cx="65" cy={stage >= 2 ? 92 : 96} rx="7" ry="4" fill={leaf} transform={`rotate(30 65 ${stage >= 2 ? 92 : 96})`} />

      {/* Stade 2 : pousse plus haute */}
      {stage >= 2 && (
        <>
          <ellipse cx="52" cy="78" rx="8" ry="4.5" fill={leaf} transform="rotate(-35 52 78)" />
          <ellipse cx="68" cy="82" rx="8" ry="4.5" fill={leaf} transform="rotate(35 68 82)" />
        </>
      )}

      {/* Stade 3 : feuillage */}
      {stage >= 3 && (
        <>
          <line x1="60" y1="70" x2="60" y2="48" stroke={stem} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="49" cy="62" rx="10" ry="5" fill={leaf} transform="rotate(-30 49 62)" />
          <ellipse cx="71" cy="58" rx="10" ry="5" fill={leaf} transform="rotate(30 71 58)" />
          <ellipse cx="52" cy="50" rx="8" ry="4.5" fill={leaf} transform="rotate(-40 52 50)" />
        </>
      )}

      {/* Stade 4 : première fleur */}
      {stage >= 4 && (
        <>
          <line x1="60" y1="48" x2="60" y2="34" stroke={stem} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="28" r="7" fill={flower} />
          <circle cx="60" cy="28" r="3" fill="#FAFAF7" />
        </>
      )}

      {/* Stade 5 : arbre fleuri */}
      {stage >= 5 && (
        <>
          <line x1="60" y1="44" x2="44" y2="30" stroke={stem} strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="40" x2="78" y2="26" stroke={stem} strokeWidth="3" strokeLinecap="round" />
          <circle cx="42" cy="26" r="6" fill={flower} />
          <circle cx="42" cy="26" r="2.5" fill="#FAFAF7" />
          <circle cx="80" cy="22" r="6" fill={flower} />
          <circle cx="80" cy="22" r="2.5" fill="#FAFAF7" />
          <ellipse cx="70" cy="40" rx="9" ry="5" fill={leaf} transform="rotate(25 70 40)" />
          <ellipse cx="50" cy="38" rx="9" ry="5" fill={leaf} transform="rotate(-25 50 38)" />
        </>
      )}
    </svg>
  );
}

function formatDateFr(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function ProgressGarden({ data }: { data: GamificationData | null }) {
  if (!data) return null;

  const nights = data.cumulative_nights;
  const stage = plantStage(nights);

  return (
    <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl text-[#1A1A1A] mb-1">Votre progression</h2>
      <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
        Chaque nuit avec votre appareil fait grandir votre plante.
        Ce total ne redescend jamais.
      </p>

      <div className="flex items-center gap-6">
        <PlantSvg stage={stage} />
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl text-[#1A1A1A] tabular-nums" style={{ fontWeight: 500 }}>
              {nights}
            </span>
            <span className="text-lg text-[#5C5C5C]">
              {nights > 1 ? 'nuits cumulées' : 'nuit cumulée'}
            </span>
          </div>
          <p className="text-base text-[#5C5C5C] mt-1 leading-relaxed">{STAGE_LABELS[stage]}</p>
        </div>
      </div>

      {/* Série — discrète, opt-in uniquement, wording neutre */}
      {data.streaks_enabled && data.current_streak != null && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#FAFAF7] border border-[#E8E5DE] p-4">
          <span
            className="mt-1.5 w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: '#CF7353' }}
            aria-hidden="true"
          />
          <p className="text-base text-[#1A1A1A] leading-relaxed">
            {data.current_streak > 0 ? (
              <>
                {data.current_streak} {data.current_streak > 1 ? 'nuits' : 'nuit'} de bonne
                observance. Continuez à votre rythme.
              </>
            ) : (
              <>Aujourd'hui est un nouveau jour. Vos {nights} nuits cumulées restent acquises.</>
            )}
          </p>
        </div>
      )}

      {/* Badges sobres — jalons factuels, dignes */}
      {data.badges.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg text-[#1A1A1A] mb-3">Vos étapes franchies</h3>
          <ul className="space-y-2">
            {data.badges.map((badge) => {
              const date = formatDateFr(badge.unlocked_at);
              return (
                <li
                  key={badge.type}
                  className="flex items-start gap-3 rounded-2xl border border-[#E8E5DE] p-4"
                >
                  <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#CF7353' }} />
                  <div>
                    <p className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                      {badge.name}
                    </p>
                    <p className="text-base text-[#5C5C5C] leading-relaxed">
                      {badge.description}
                      {date ? ` — ${date}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
