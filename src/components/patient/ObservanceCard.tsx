/**
 * Carte observance réglementaire en langage simple — SANS culpabilisation.
 * "Votre utilisation : Xh sur les 28 derniers jours. L'Assurance Maladie
 * demande 112 heures." + jauge factuelle.
 */

export interface ObservanceSummary {
  window_start: string | null;
  window_end: string | null;
  total_hours: number;
  target_hours: number;
  percent: number;
  nights_with_data: number;
  avg_hours_per_night: number | null;
  source: 'engine' | 'computed' | 'none';
}

function neutralMessage(o: ObservanceSummary): string {
  if (o.source === 'none' || o.nights_with_data === 0) {
    return 'Vos données d\'utilisation apparaîtront ici dès la première nuit enregistrée.';
  }
  if (o.total_hours >= o.target_hours) {
    return 'C\'est suffisant pour votre remboursement. Continuez ainsi, à votre rythme.';
  }
  if (o.total_hours >= o.target_hours / 2) {
    return 'Vous êtes en chemin. Chaque nuit avec votre masque compte.';
  }
  return 'Chaque heure compte, à votre rythme. Votre équipe peut vous aider si besoin.';
}

export function ObservanceCard({ observance }: { observance: ObservanceSummary | null }) {
  if (!observance) return null;

  const hours = Math.round(observance.total_hours);
  const pct = Math.max(0, Math.min(100, observance.percent));

  return (
    <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl text-[#1A1A1A] mb-1">Votre utilisation sur 28 jours</h2>
      <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
        L'Assurance Maladie (la Sécurité sociale) demande 112 heures d'utilisation
        sur 28 jours pour le remboursement complet de votre appareil.
      </p>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl text-[#1A1A1A] tabular-nums" style={{ fontWeight: 500 }}>
          {hours}
        </span>
        <span className="text-lg text-[#5C5C5C]">
          heures sur les 28 derniers jours
        </span>
      </div>

      {/* Jauge — bleu factuel, jamais rouge punitif */}
      <div
        className="h-4 rounded-full bg-[#F2F0EB] overflow-hidden"
        role="progressbar"
        aria-valuenow={hours}
        aria-valuemin={0}
        aria-valuemax={observance.target_hours}
        aria-label={`${hours} heures sur les ${observance.target_hours} demandées`}
      >
        <div
          className="h-full rounded-full bg-[#007AFF]"
          style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-base text-[#5C5C5C]">
        <span>0 h</span>
        <span className="tabular-nums">{observance.target_hours} h demandées</span>
      </div>

      <p className="text-base text-[#1A1A1A] mt-4 leading-relaxed">
        {neutralMessage(observance)}
      </p>

      {observance.avg_hours_per_night != null && observance.nights_with_data > 0 && (
        <p className="text-base text-[#5C5C5C] mt-2">
          En moyenne : {observance.avg_hours_per_night.toFixed(1).replace('.', ',')} heures par nuit,
          sur {observance.nights_with_data} nuits enregistrées.
        </p>
      )}
    </section>
  );
}
