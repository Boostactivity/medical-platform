/**
 * PORTAIL MÉDECIN — fiche patient en drawer latéral.
 *
 * - Courbe observance 90 jours (Recharts, seuil 4 h/nuit matérialisé)
 * - Historique des fenêtres 28 j (bande, heures, nuits > 4 h)
 * - Alertes actives (sévérité décroissante)
 * - Bloc-notes privé du médecin (autosave, jamais visible des autres rôles)
 * - Mention "Référence accord préalable AmeliPro" pour les patients en 9.INI
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiError } from '../../utils/api';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Textarea } from '../ui/textarea';
import {
  BAND_META,
  type DoctorNote,
  type PatientDetail,
  SEVERITY_META,
  alertTypeLabel,
  formatDateFr,
  formatDateShort,
  formatHours,
  formatIah,
} from './types';

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface PatientDrawerProps {
  patientId: string | null;
  onClose: () => void;
}

export function PatientDrawer({ patientId, onClose }: PatientDrawerProps) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bloc-notes
  const [noteContent, setNoteContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef('');

  useEffect(() => {
    if (!patientId) {
      setDetail(null);
      setNoteContent('');
      setSaveState('idle');
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setDetail(null);

    api
      .get(`/doctor/patients/${patientId}`)
      .then((data: PatientDetail) => {
        if (cancelled) return;
        setDetail(data);
        const note: DoctorNote | undefined = data.notes?.[0];
        setNoteContent(note?.content ?? '');
        lastSavedContent.current = note?.content ?? '';
        setSaveState('idle');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          e instanceof ApiError && e.status === 404
            ? 'Ce patient ne fait pas partie de votre cohorte.'
            : 'Impossible de charger la fiche patient.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [patientId]);

  const saveNote = useCallback(
    async (content: string) => {
      if (!patientId || content === lastSavedContent.current) {
        setSaveState((s) => (s === 'pending' ? 'idle' : s));
        return;
      }
      setSaveState('saving');
      try {
        await api.post('/doctor/notes', { patient_id: patientId, content });
        lastSavedContent.current = content;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    },
    [patientId],
  );

  const handleNoteChange = (value: string) => {
    setNoteContent(value);
    setSaveState('pending');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote(value), 1200);
  };

  const chartData = (detail?.observance_data ?? []).map((n) => ({
    date: n.date,
    heures: n.usage_hours,
  }));

  const status = detail?.therapy_status ?? null;
  const isInitialPhase = status?.phase === 'initial';

  const saveLabel: Record<SaveState, string> = {
    idle: '',
    pending: 'Modifications en attente…',
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    error: "Échec de l'enregistrement — vos modifications ne sont pas sauvegardées",
  };

  return (
    <Sheet open={patientId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto gap-0">
        {loading && (
          <div className="p-6 text-sm text-muted-foreground">Chargement de la fiche patient…</div>
        )}

        {loadError && !loading && (
          <div className="p-6 text-sm text-muted-foreground">{loadError}</div>
        )}

        {detail && !loading && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="text-base font-medium">
                {detail.patient.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {[detail.patient.email, detail.patient.phone].filter(Boolean).join(' · ') ||
                  'Coordonnées non renseignées'}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {status?.lppr_codes && (
                  <Badge
                    variant="outline"
                    className={
                      isInitialPhase
                        ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20'
                        : ''
                    }
                  >
                    {status.lppr_codes.short_code}
                  </Badge>
                )}
                {status && (
                  <span className="text-xs text-muted-foreground">
                    {status.phase === 'initial'
                      ? `Phase initiale jusqu'au ${formatDateFr(status.initial_phase_end_date)}`
                      : status.phase === 'maintenance'
                        ? 'Phase de maintenance'
                        : 'Traitement arrêté'}
                    {status.telesuivi_consent === false && ' · télésuivi refusé'}
                  </span>
                )}
                {detail.patient.treatment_start_date && (
                  <span className="text-xs text-muted-foreground">
                    Appareillé depuis le {formatDateFr(detail.patient.treatment_start_date)}
                  </span>
                )}
              </div>
              {isInitialPhase && (
                <p className="text-xs text-muted-foreground pt-1">
                  Référence accord préalable AmeliPro :{' '}
                  {status?.prior_agreement_ref ?? 'non renseignée'}
                </p>
              )}
            </SheetHeader>

            <div className="p-4 space-y-6">
              {/* Courbe 90 jours */}
              <section>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Observance — 90 derniers jours
                </h3>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md py-8 text-center">
                    Aucun relevé d'observance sur les 90 derniers jours.
                  </p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDateShort}
                          tick={{ fontSize: 11 }}
                          minTickGap={32}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          domain={[0, 'auto']}
                          tickFormatter={(v: number) => `${v}h`}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatHours(value, 1), 'Utilisation']}
                          labelFormatter={(label: string) => formatDateFr(label)}
                        />
                        <ReferenceLine
                          y={4}
                          stroke="#B34000"
                          strokeDasharray="4 4"
                          label={{ value: '4 h/nuit', fontSize: 10, position: 'insideTopRight' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="heures"
                          stroke="#007AFF"
                          fill="#007AFF"
                          fillOpacity={0.12}
                          strokeWidth={1.5}
                          connectNulls
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <Separator />

              {/* Historique fenêtres 28 j */}
              <section>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Fenêtres 28 jours glissantes
                </h3>
                {detail.observance_periods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune fenêtre calculée. Le moteur d'observance n'a pas encore traité ce patient.
                  </p>
                ) : (
                  <ul className="divide-y divide-border border border-border rounded-md">
                    {detail.observance_periods.map((period) => {
                      const band = BAND_META[period.compliance_band];
                      return (
                        <li
                          key={period.window_end}
                          className="flex items-center gap-3 px-3 py-2 text-sm"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${band.dot}`} />
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDateShort(period.window_start)} → {formatDateShort(period.window_end)}
                          </span>
                          <span className="font-medium tabular-nums ml-auto">
                            {formatHours(Number(period.total_hours))}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {period.nights_over_4h} nuits &gt; 4 h
                          </span>
                          <span className={`text-xs whitespace-nowrap ${band.text}`}>
                            {band.range}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <Separator />

              {/* Alertes actives */}
              <section>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Alertes actives ({detail.alerts.length})
                </h3>
                {detail.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.alerts.map((alert) => {
                      const sev = SEVERITY_META[alert.severity] ?? SEVERITY_META.low;
                      return (
                        <li
                          key={alert.id}
                          className="flex items-start gap-2 border border-border rounded-md px-3 py-2"
                        >
                          <Badge variant="outline" className={`shrink-0 ${sev.className}`}>
                            {sev.label}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">
                              {alert.title ?? alert.message ?? alertTypeLabel(alert)}
                            </p>
                            {alert.details && (
                              <p className="text-xs text-muted-foreground">{alert.details}</p>
                            )}
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatDateFr(alert.created_at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <Separator />

              {/* Bloc-notes privé */}
              <section>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">Bloc-notes privé</h3>
                  <span
                    className={`text-xs ${
                      saveState === 'error' ? 'text-red-600' : 'text-muted-foreground'
                    }`}
                  >
                    {saveLabel[saveState]}
                  </span>
                </div>
                <Textarea
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Vos notes cliniques sur ce patient. Visibles par vous seul."
                  className="min-h-32 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Enregistrement automatique. Ces notes ne sont accessibles ni au patient, ni au
                  prestataire, ni aux autres médecins.
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
