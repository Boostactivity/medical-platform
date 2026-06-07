/**
 * Breakdown transparent des 6 critères du score (scoring-engine.ts).
 * Le patient voit EXACTEMENT comment son score est composé.
 *
 * Anti-shame : on n'affiche PAS les messages bruts du moteur (qui peuvent
 * dire "très insuffisant") — on affiche les faits (points obtenus) avec des
 * explications simples, jargon défini entre parenthèses (lecture 9-11 ans).
 */

interface CriterionScore {
  score: number;
  max_score: number;
  percentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

export interface ScoreCriteria {
  usage?: CriterionScore;
  ahi?: CriterionScore;
  leak?: CriterionScore;
  mask_fit?: CriterionScore;
  pressure?: CriterionScore;
  consistency?: CriterionScore;
}

/** Libellés simples + explications sans jargon (ou jargon défini). */
const CRITERIA_LABELS: Array<{
  key: keyof ScoreCriteria;
  label: string;
  explanation: string;
}> = [
  {
    key: 'usage',
    label: 'Temps d\'utilisation',
    explanation: 'Le nombre d\'heures passées avec votre masque cette nuit. C\'est le critère qui compte le plus.',
  },
  {
    key: 'ahi',
    label: 'Contrôle des apnées (IAH)',
    explanation: 'L\'IAH compte vos pauses de respiration par heure de sommeil. En dessous de 5, votre traitement fait bien son travail.',
  },
  {
    key: 'leak',
    label: 'Étanchéité du masque (fuites)',
    explanation: 'L\'air qui s\'échappe sur les côtés du masque. Moins il y a de fuites, mieux le traitement agit.',
  },
  {
    key: 'mask_fit',
    label: 'Stabilité du masque',
    explanation: 'Le nombre de fois où le masque a bougé ou a été retiré pendant la nuit.',
  },
  {
    key: 'pressure',
    label: 'Pression de l\'air',
    explanation: 'La force de l\'air envoyé par votre machine. Elle doit rester dans la bonne plage pour vous.',
  },
  {
    key: 'consistency',
    label: 'Régularité',
    explanation: 'Utiliser votre machine à un rythme stable, nuit après nuit, aide votre corps à s\'habituer.',
  },
];

export function ScoreBreakdown({ criteria }: { criteria: ScoreCriteria }) {
  return (
    <div>
      <h3 className="text-xl text-[#1A1A1A] mb-2">Comment votre score est calculé</h3>
      <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
        Votre score additionne 6 critères, pour un total de 100 points.
        Rien n'est caché : voici le détail de cette nuit.
      </p>

      <ul className="space-y-5">
        {CRITERIA_LABELS.map(({ key, label, explanation }) => {
          const crit = criteria[key];
          if (!crit) return null;
          const pct = Math.max(0, Math.min(100, crit.percentage ?? 0));

          return (
            <li key={key}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                  {label}
                </span>
                <span className="text-base text-[#1A1A1A] tabular-nums whitespace-nowrap">
                  {Math.round(crit.score * 10) / 10} / {crit.max_score} points
                </span>
              </div>
              {/* Jauge factuelle — toujours bleue, jamais rouge punitif */}
              <div className="h-3 rounded-full bg-[#F2F0EB] overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[#007AFF]"
                  style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                />
              </div>
              <p className="text-base text-[#5C5C5C] mt-1.5 leading-relaxed">{explanation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
