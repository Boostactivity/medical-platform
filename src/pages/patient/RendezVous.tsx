/**
 * RENDEZ-VOUS PATIENT — demande de RDV au prestataire (audience 50-70 ans).
 *
 * Règles dures :
 *   - Vouvoiement, polices ≥ 16px, ANTI-SHAME, aucun emoji.
 *   - Demande simple : type + 2-3 disponibilités + message.
 *   - Liste des demandes avec statuts ; créneau proposé → bouton confirmer.
 *
 * Données réelles via src/utils/api.ts → routes /patient/rdv.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../utils/api';

interface PreferredDate {
  date: string;
  time_slot: 'matin' | 'apres_midi' | 'indifferent';
}

interface AppointmentRequest {
  id: string;
  type: string;
  preferred_dates: PreferredDate[];
  message: string | null;
  status: string;
  proposed_slot: { date: string; time_slot: 'morning' | 'afternoon' } | null;
  created_at: string;
}

const RDV_TYPES: Array<{ value: string; label: string; hint: string }> = [
  { value: 'install', label: 'Installation', hint: 'Mise en place de votre appareil' },
  { value: 'controle', label: 'Visite de contrôle', hint: 'Vérification de votre matériel' },
  { value: 'depannage', label: 'Dépannage', hint: 'Votre appareil ne fonctionne pas normalement' },
  { value: 'renouvellement', label: 'Renouvellement de matériel', hint: 'Masque, tubulure ou filtres à changer' },
  { value: 'autre', label: 'Autre demande', hint: 'Tout autre sujet' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RDV_TYPES.map((t) => [t.value, t.label]),
);

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  requested: { label: 'Envoyée', className: 'bg-[#F2F0EB] text-[#5C5C5C]' },
  proposed: { label: 'Créneau proposé', className: 'bg-[#007AFF]/10 text-[#007AFF]' },
  confirmed: { label: 'Confirmé', className: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Indisponible', className: 'bg-[#F2F0EB] text-[#5C5C5C]' },
  cancelled: { label: 'Annulée', className: 'bg-[#F2F0EB] text-[#5C5C5C]' },
};

const PATIENT_SLOT_LABELS: Record<string, string> = {
  matin: 'matin',
  apres_midi: 'après-midi',
  indifferent: 'matin ou après-midi',
};

const PRO_SLOT_LABELS: Record<string, string> = {
  morning: 'le matin',
  afternoon: 'l\'après-midi',
};

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso.split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso ?? '';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

interface AvailabilityRow {
  date: string;
  time_slot: 'matin' | 'apres_midi' | 'indifferent';
}

const EMPTY_ROW: AvailabilityRow = { date: '', time_slot: 'indifferent' };

export function RendezVous() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);

  // Formulaire
  const [type, setType] = useState<string | null>(null);
  const [rows, setRows] = useState<AvailabilityRow[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/patient/rdv');
      setRequests(res.requests ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/patient/connexion');
        return;
      }
      toast.error('Vos demandes ne sont pas accessibles pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (index: number, patch: Partial<AvailabilityRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    if (!type) {
      toast.error('Choisissez d\'abord le motif de votre rendez-vous.');
      return;
    }
    const dates = rows.filter((r) => r.date);
    if (dates.length === 0) {
      toast.error('Indiquez au moins une disponibilité.');
      return;
    }
    setSending(true);
    try {
      await api.post('/patient/rdv', {
        type,
        preferred_dates: dates,
        message: message.trim() || undefined,
      });
      toast.success('Votre demande est envoyée. Votre prestataire vous proposera un créneau.');
      setType(null);
      setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
      setMessage('');
      load();
    } catch {
      toast.error('L\'envoi n\'a pas fonctionné. Réessayez ou appelez votre prestataire.');
    } finally {
      setSending(false);
    }
  };

  const patchRequest = async (id: string, action: 'cancel' | 'accept') => {
    setActingId(id);
    try {
      await api.patch(`/patient/rdv/${id}`, { action });
      toast.success(
        action === 'accept'
          ? 'Le rendez-vous est confirmé. Votre prestataire vous attend.'
          : 'Votre demande est annulée.',
      );
      load();
    } catch {
      toast.error('L\'opération n\'a pas fonctionné. Réessayez dans un instant.');
    } finally {
      setActingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">Chargement de vos rendez-vous…</p>
        </div>
      </div>
    );
  }

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
          <span className="text-lg text-[#1A1A1A]">Mes rendez-vous</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* 1. Demande de rendez-vous */}
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <h1 className="text-xl text-[#1A1A1A] mb-1">Demander un rendez-vous</h1>
          <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
            Indiquez le motif et vos disponibilités : votre prestataire vous
            proposera un créneau précis.
          </p>

          {/* Motif */}
          <p className="text-base text-[#1A1A1A] mb-2" style={{ fontWeight: 500 }}>
            Quel est le motif ?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {RDV_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`text-left rounded-2xl border px-4 py-3 transition-colors ${
                  type === t.value
                    ? 'border-[#007AFF] bg-[#007AFF]/5'
                    : 'border-[#E8E5DE] hover:border-[#007AFF]/40'
                }`}
              >
                <span className="block text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                  {t.label}
                </span>
                <span className="block text-base text-[#5C5C5C]">{t.hint}</span>
              </button>
            ))}
          </div>

          {/* Disponibilités */}
          <p className="text-base text-[#1A1A1A] mb-2" style={{ fontWeight: 500 }}>
            Vos disponibilités (1 à 3 dates)
          </p>
          <div className="space-y-2 mb-3">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  min={today}
                  value={row.date}
                  onChange={(e) => updateRow(index, { date: e.target.value })}
                  aria-label={`Date de disponibilité ${index + 1}`}
                  className="h-12 flex-1 rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] focus:outline-none focus:border-[#007AFF]"
                />
                <select
                  value={row.time_slot}
                  onChange={(e) =>
                    updateRow(index, { time_slot: e.target.value as AvailabilityRow['time_slot'] })
                  }
                  aria-label={`Créneau de disponibilité ${index + 1}`}
                  className="h-12 sm:w-56 rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] focus:outline-none focus:border-[#007AFF]"
                >
                  <option value="indifferent">Matin ou après-midi</option>
                  <option value="matin">Plutôt le matin</option>
                  <option value="apres_midi">Plutôt l'après-midi</option>
                </select>
              </div>
            ))}
          </div>
          {rows.length < 3 && (
            <button
              onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}
              className="text-base text-[#007AFF] hover:underline mb-6"
            >
              Ajouter une troisième disponibilité
            </button>
          )}

          {/* Message */}
          <label htmlFor="rdv-message" className="block text-base text-[#1A1A1A] mb-2 mt-2" style={{ fontWeight: 500 }}>
            Un message pour votre prestataire (facultatif)
          </label>
          <textarea
            id="rdv-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Décrivez votre besoin en quelques mots."
            className="w-full rounded-xl border border-[#E8E5DE] bg-white px-4 py-3 text-base text-[#1A1A1A] placeholder:text-[#9A9890] focus:outline-none focus:border-[#007AFF] mb-4"
          />

          <button
            onClick={submit}
            disabled={sending}
            className="w-full h-14 rounded-2xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
            style={{ fontWeight: 500 }}
          >
            {sending ? 'Envoi en cours…' : 'Envoyer ma demande'}
          </button>
        </section>

        {/* 2. Demandes en cours et passées */}
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl text-[#1A1A1A] mb-4">Vos demandes</h2>
          {requests.length === 0 ? (
            <div className="text-center py-6">
              <CalendarDays className="w-8 h-8 text-[#9A9890] mx-auto mb-2" />
              <p className="text-base text-[#5C5C5C]">
                Vous n'avez pas encore de demande de rendez-vous.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => {
                const status = STATUS_LABELS[req.status] ?? {
                  label: req.status,
                  className: 'bg-[#F2F0EB] text-[#5C5C5C]',
                };
                return (
                  <li key={req.id} className="rounded-2xl border border-[#E8E5DE] px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                        {TYPE_LABELS[req.type] ?? req.type}
                      </span>
                      <span className={`rounded-full px-3 py-0.5 text-base ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    {Array.isArray(req.preferred_dates) && req.preferred_dates.length > 0 && (
                      <p className="text-base text-[#5C5C5C] leading-relaxed">
                        Vos disponibilités :{' '}
                        {req.preferred_dates
                          .map(
                            (d) =>
                              `${formatDateFr(d.date)} (${PATIENT_SLOT_LABELS[d.time_slot] ?? d.time_slot})`,
                          )
                          .join(' · ')}
                      </p>
                    )}

                    {req.status === 'proposed' && req.proposed_slot && (
                      <div className="mt-3 rounded-xl bg-[#007AFF]/5 border border-[#007AFF]/20 px-4 py-3">
                        <p className="text-base text-[#1A1A1A] mb-3">
                          Votre prestataire vous propose :{' '}
                          <span style={{ fontWeight: 500 }}>
                            {formatDateFr(req.proposed_slot.date)},{' '}
                            {PRO_SLOT_LABELS[req.proposed_slot.time_slot] ?? req.proposed_slot.time_slot}
                          </span>
                        </p>
                        <button
                          onClick={() => patchRequest(req.id, 'accept')}
                          disabled={actingId === req.id}
                          className="w-full sm:w-auto h-12 px-6 rounded-xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
                          style={{ fontWeight: 500 }}
                        >
                          Confirmer ce créneau
                        </button>
                      </div>
                    )}

                    {req.status === 'confirmed' && req.proposed_slot && (
                      <p className="text-base text-emerald-700 mt-2">
                        Rendez-vous prévu : {formatDateFr(req.proposed_slot.date)},{' '}
                        {PRO_SLOT_LABELS[req.proposed_slot.time_slot] ?? req.proposed_slot.time_slot}.
                      </p>
                    )}

                    {req.status === 'declined' && (
                      <p className="text-base text-[#5C5C5C] mt-2 leading-relaxed">
                        Ces dates ne sont pas disponibles. Votre prestataire va vous
                        recontacter ; vous pouvez aussi refaire une demande avec
                        d'autres dates.
                      </p>
                    )}

                    {['requested', 'proposed'].includes(req.status) && (
                      <button
                        onClick={() => patchRequest(req.id, 'cancel')}
                        disabled={actingId === req.id}
                        className="mt-3 text-base text-[#5C5C5C] hover:text-[#1A1A1A] underline underline-offset-2 disabled:opacity-60"
                      >
                        Annuler cette demande
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
