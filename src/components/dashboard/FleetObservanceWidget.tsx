/**
 * Widget observance flotte — branché sur le moteur LPPR (/observance/fleet).
 * Répartition des patients par bande réglementaire (28 j glissants) +
 * liste priorisée des patients sous le seuil des 112 h.
 *
 * Données réelles uniquement : si le moteur n'a encore rien calculé,
 * état vide honnête avec bouton de recalcul.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, RefreshCw, TrendingDown } from 'lucide-react';
import { api } from '../../utils/api';

interface FleetData {
  total_patients: number;
  patients_with_data: number;
  bands: { full: number; partial: number; low: number; none: number };
  below_threshold: Array<{ patient_id: string; total_hours: number; band: string }>;
}

const BAND_META: Record<string, { label: string; classes: string }> = {
  full: { label: '≥ 112 h', classes: 'bg-green-50 text-green-700 border-green-200' },
  partial: { label: '56 – 112 h', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  low: { label: '< 56 h', classes: 'bg-red-50 text-red-700 border-red-200' },
  none: { label: 'Sans relevé', classes: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export function FleetObservanceWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fleet = await api.get('/observance/fleet');
      setData(fleet);
    } catch (e: any) {
      setError(e?.message ?? 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#007AFF]" />
          Observance flotte (28 jours glissants)
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-[#007AFF] hover:text-[#0051D5] flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="text-sm text-[#5C5C5C] py-6 text-center">
          Données d'observance indisponibles : {error}
        </div>
      ) : loading && !data ? (
        <div className="py-8 flex justify-center">
          <RefreshCw className="w-6 h-6 text-[#007AFF] animate-spin" />
        </div>
      ) : !data || data.patients_with_data === 0 ? (
        <div className="text-sm text-[#5C5C5C] py-6 text-center">
          <p>Aucune fenêtre d'observance calculée pour l'instant.</p>
          <p className="text-xs mt-1">
            Le moteur tourne chaque nuit à 2h30 — ou lancez un recalcul depuis la fiche patient.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {(['full', 'partial', 'low', 'none'] as const).map((band) => (
              <div key={band} className={`rounded-xl border p-3 text-center ${BAND_META[band].classes}`}>
                <div className="text-2xl tabular-nums">{data.bands[band] ?? 0}</div>
                <div className="text-xs mt-0.5">{BAND_META[band].label}</div>
              </div>
            ))}
          </div>

          {data.below_threshold.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-[#5C5C5C] mb-2">
                <TrendingDown className="w-4 h-4 text-[#B34000]" />
                {data.below_threshold.length} patient(s) sous le seuil des 112 h — forfait LPPR réduit
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {data.below_threshold.slice(0, 8).map((p) => (
                  <button
                    key={p.patient_id}
                    onClick={() => navigate(`/pro/patients/${p.patient_id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#FAFAF7] hover:bg-[#F2F0EB] transition-colors text-left"
                  >
                    <span className="text-sm text-[#1A1A1A] truncate">{p.patient_id.slice(0, 8)}…</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${BAND_META[p.band]?.classes ?? ''}`}>
                      {p.total_hours} h / 28 j
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
