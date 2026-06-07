/**
 * Écran-pivot matinal du portail patient.
 * Score nightly GRAND au centre + message bienveillant (anti-shame strict)
 * + panneau "Comprendre mon score" : breakdown transparent des 6 critères.
 *
 * Règles dures : vouvoiement, ≥16px, jamais de culpabilisation.
 * Le cercle reste BLEU quel que soit le score — pas de rouge punitif.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ScoreBreakdown, type ScoreCriteria } from './ScoreBreakdown';

export interface PatientScore {
  total_score: number;
  grade: string | null;
  criteria: ScoreCriteria | null;
  date: string;
  trend: 'improving' | 'stable' | 'declining';
  previous_score: number | null;
}

interface ScoreHeroProps {
  score: PatientScore | null;
  firstName: string;
}

/** Message du matin — anti-shame absolu (research/15 §VIII). */
function morningMessage(score: PatientScore | null, firstName: string): string {
  const hello = firstName ? `Bonjour ${firstName}. ` : 'Bonjour. ';

  if (!score) {
    return `${hello}Pas de données cette nuit ? Pas grave. Aujourd'hui est un nouveau jour.`;
  }
  const s = score.total_score;
  if (s >= 85) {
    return `${hello}Votre score est à ${s} cette nuit. Très belle nuit, votre traitement fonctionne très bien.`;
  }
  if (s >= 70) {
    return `${hello}Votre score est à ${s} cette nuit. Vous portez bien votre masque, continuez !`;
  }
  if (s >= 50) {
    return `${hello}Votre score est à ${s} cette nuit. Votre traitement avance, chaque nuit compte.`;
  }
  return `${hello}Nuit difficile ? Cela arrive à tout le monde. Votre équipe est là pour vous aider.`;
}

function formatDateFr(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateStr;
  }
}

export function ScoreHero({ score, firstName }: ScoreHeroProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const value = score?.total_score ?? null;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const progress = value != null ? (value / 100) * circumference : 0;

  return (
    <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
      {/* Cercle de score — grand, au centre */}
      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56" role="img" aria-label={value != null ? `Votre score de la nuit : ${value} sur 100` : 'Pas de score cette nuit'}>
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#F2F0EB" strokeWidth="14" />
            {value != null && (
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#007AFF"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {value != null ? (
              <>
                <span className="text-6xl text-[#1A1A1A] tabular-nums" style={{ fontWeight: 500 }}>
                  {value}
                </span>
                <span className="text-base text-[#5C5C5C]">sur 100</span>
              </>
            ) : (
              <span className="text-2xl text-[#5C5C5C]">—</span>
            )}
          </div>
        </div>

        {score && (
          <p className="text-base text-[#5C5C5C] mt-2">
            Nuit du {formatDateFr(score.date)}
          </p>
        )}

        {/* Message bienveillant */}
        <p className="text-lg sm:text-xl text-[#1A1A1A] text-center mt-4 max-w-md leading-relaxed">
          {morningMessage(score, firstName)}
        </p>

        {/* Comprendre mon score — transparence totale */}
        {score?.criteria && (
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="mt-6 inline-flex items-center gap-2 px-6 h-12 rounded-full border border-[#007AFF] text-[#007AFF] text-base hover:bg-[#007AFF]/5 transition-colors"
          >
            Comprendre mon score
            {showBreakdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>

      {showBreakdown && score?.criteria && (
        <div className="mt-8 pt-6 border-t border-[#E8E5DE]">
          <ScoreBreakdown criteria={score.criteria} />
        </div>
      )}
    </section>
  );
}
