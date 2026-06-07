/**
 * Préférences patient — streaks OPT-IN et désactivables, rappels.
 * Chaque changement est enregistré immédiatement (pas de bouton "Valider"
 * à chercher), avec confirmation par toast.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { api } from '../../utils/api';

export interface PatientPreferences {
  streaks_enabled: boolean;
  notifications_daily_max: number;
  notification_channel: string;
  dark_mode: boolean;
}

interface PreferencesCardProps {
  preferences: PatientPreferences;
  onChange: (prefs: PatientPreferences) => void;
}

export function PreferencesCard({ preferences, onChange }: PreferencesCardProps) {
  const [saving, setSaving] = useState(false);

  const save = async (patch: Partial<PatientPreferences>) => {
    const next = { ...preferences, ...patch };
    onChange(next); // optimiste — l'interface répond tout de suite
    setSaving(true);
    try {
      const res = await api.patch('/patient/preferences', patch);
      if (res?.preferences) onChange(res.preferences);
      toast.success('Vos préférences sont enregistrées.');
    } catch {
      onChange(preferences); // retour à l'état précédent
      toast.error('L\'enregistrement n\'a pas fonctionné. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl text-[#1A1A1A] mb-1">Vos préférences</h2>
      <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
        Ce tableau de bord s'adapte à vous, pas l'inverse.
      </p>

      <div className="space-y-6">
        {/* Streaks : opt-in, désactivable à tout moment */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="pref-streaks" className="text-base text-[#1A1A1A] cursor-pointer">
              Afficher ma série de nuits
            </Label>
            <p className="text-base text-[#5C5C5C] leading-relaxed mt-0.5">
              Une série compte vos nuits de bonne observance d'affilée.
              Vous pouvez la masquer quand vous voulez : vos nuits cumulées
              restent toujours acquises.
            </p>
          </div>
          <Switch
            id="pref-streaks"
            checked={preferences.streaks_enabled}
            disabled={saving}
            onCheckedChange={(checked) => save({ streaks_enabled: checked })}
            className="mt-1 shrink-0"
          />
        </div>

        <div className="h-px bg-[#E8E5DE]" />

        {/* Rappels : max 1/jour par défaut, jamais de harcèlement */}
        <div>
          <Label htmlFor="pref-notif" className="text-base text-[#1A1A1A]">
            Rappels par jour (au maximum)
          </Label>
          <p className="text-base text-[#5C5C5C] leading-relaxed mt-0.5 mb-3">
            Nous ne vous enverrons jamais plus de rappels que ce que vous choisissez ici.
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Nombre de rappels par jour">
            {[0, 1, 2].map((n) => {
              const selected = preferences.notifications_daily_max === n;
              return (
                <button
                  key={n}
                  role="radio"
                  aria-checked={selected}
                  disabled={saving}
                  onClick={() => save({ notifications_daily_max: n })}
                  className={`h-12 px-5 rounded-full border-2 text-base transition-colors ${
                    selected
                      ? 'border-[#007AFF] bg-[#007AFF] text-white'
                      : 'border-[#E8E5DE] bg-white text-[#1A1A1A] hover:border-[#007AFF]/40'
                  }`}
                >
                  {n === 0 ? 'Aucun rappel' : n === 1 ? '1 rappel' : `${n} rappels`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
