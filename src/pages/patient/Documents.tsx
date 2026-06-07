/**
 * DOCUMENTS PATIENT — liste des documents + attestation de voyage.
 *
 * Règles dures :
 *   - Vouvoiement, polices ≥ 16px, aucun emoji.
 *   - Attestation de voyage : dates + destination → génération côté
 *     serveur (payload structuré) → affichage formaté imprimable
 *     (window.print, zone print-only via la variante Tailwind `print:`).
 *
 * Données réelles via src/utils/api.ts → routes /patient/documents.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Plane, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../utils/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

interface AttestationPayload {
  issued_at: string;
  patient: { name: string | null; email: string | null };
  device: { manufacturer: string | null; model: string | null; serial_number: string | null } | null;
  travel: { departure_date: string; return_date: string; destination: string | null };
  regulatory_text: string[];
}

interface PatientDocument {
  id: string;
  doc_type: string;
  title: string;
  storage_path: string | null;
  generated: boolean;
  payload: AttestationPayload | null;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ordonnance: 'Ordonnance',
  attestation_voyage: 'Attestation de voyage',
  rapport: 'Rapport',
  justificatif: 'Justificatif',
  autre: 'Document',
};

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso ?? '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Documents() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  // Dialog attestation : formulaire
  const [formOpen, setFormOpen] = useState(false);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [destination, setDestination] = useState('');
  const [generating, setGenerating] = useState(false);

  // Attestation affichée (vue imprimable)
  const [viewed, setViewed] = useState<PatientDocument | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/patient/documents');
      setDocuments(res.documents ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/patient/connexion');
        return;
      }
      toast.error('Vos documents ne sont pas accessibles pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const generateAttestation = async () => {
    if (!departureDate || !returnDate) {
      toast.error('Indiquez vos dates de départ et de retour.');
      return;
    }
    if (returnDate < departureDate) {
      toast.error('La date de retour doit être après la date de départ.');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/patient/documents/attestation-voyage', {
        departure_date: departureDate,
        return_date: returnDate,
        destination: destination.trim() || undefined,
      });
      toast.success('Votre attestation est prête.');
      setFormOpen(false);
      setDepartureDate('');
      setReturnDate('');
      setDestination('');
      await load();
      if (res.document) setViewed(res.document);
    } catch {
      toast.error('La génération n\'a pas fonctionné. Réessayez dans un instant.');
    } finally {
      setGenerating(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const attestation = viewed?.payload ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">Chargement de vos documents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      {/* Zone écran (masquée à l'impression : seule l'attestation s'imprime) */}
      <div className="print:hidden">
        <header className="bg-white border-b border-[#E8E5DE] sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <Link
              to="/patient/dashboard"
              className="flex items-center gap-2 h-11 px-3 rounded-xl text-base text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Mon espace</span>
            </Link>
            <span className="text-lg text-[#1A1A1A]">Mes documents</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          {/* 1. Attestation de voyage */}
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <Plane className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl text-[#1A1A1A] mb-1">Vous partez en voyage ?</h1>
                <p className="text-base text-[#5C5C5C] leading-relaxed mb-4">
                  Votre appareil PPC voyage en cabine, comme tout dispositif
                  médical. Générez une attestation à présenter à la compagnie
                  aérienne si on vous la demande.
                </p>
                <button
                  onClick={() => setFormOpen(true)}
                  className="h-12 px-6 rounded-xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Créer mon attestation de voyage
                </button>
              </div>
            </div>
          </section>

          {/* 2. Liste des documents */}
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl text-[#1A1A1A] mb-4">Vos documents</h2>
            {documents.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-[#9A9890] mx-auto mb-2" />
                <p className="text-base text-[#5C5C5C]">
                  Vous n'avez pas encore de document. Votre prestataire peut en
                  déposer ici, et vos attestations générées s'y retrouveront.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[#E8E5DE] px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[#007AFF] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                          {doc.title}
                        </p>
                        <p className="text-base text-[#5C5C5C]">
                          {DOC_TYPE_LABELS[doc.doc_type] ?? 'Document'} —{' '}
                          {formatDateFr(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    {doc.generated && doc.doc_type === 'attestation_voyage' && doc.payload && (
                      <button
                        onClick={() => setViewed(doc)}
                        className="h-11 px-4 rounded-xl border border-[#E8E5DE] text-base text-[#1A1A1A] hover:border-[#007AFF]/40 transition-colors shrink-0"
                      >
                        Afficher et imprimer
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>

      {/* Dialog : formulaire attestation */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Attestation de voyage</DialogTitle>
            <DialogDescription className="text-base">
              Indiquez vos dates : l'attestation est générée immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="att-depart" className="block text-base text-[#1A1A1A] mb-1.5">
                Date de départ
              </label>
              <input
                id="att-depart"
                type="date"
                min={today}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
            <div>
              <label htmlFor="att-retour" className="block text-base text-[#1A1A1A] mb-1.5">
                Date de retour
              </label>
              <input
                id="att-retour"
                type="date"
                min={departureDate || today}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
            <div>
              <label htmlFor="att-destination" className="block text-base text-[#1A1A1A] mb-1.5">
                Destination (facultatif)
              </label>
              <input
                id="att-destination"
                type="text"
                maxLength={200}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Par exemple : Lisbonne, Portugal"
                className="h-12 w-full rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] placeholder:text-[#9A9890] focus:outline-none focus:border-[#007AFF]"
              />
            </div>
            <button
              onClick={generateAttestation}
              disabled={generating}
              className="w-full h-13 py-3 rounded-2xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {generating ? 'Génération en cours…' : 'Générer mon attestation'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog : attestation affichée (écran) */}
      <Dialog open={!!viewed} onOpenChange={(open) => !open && setViewed(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Attestation de voyage</DialogTitle>
            <DialogDescription className="text-base">
              Présentez ce document à la compagnie de transport si nécessaire.
            </DialogDescription>
          </DialogHeader>
          {attestation && (
            <div className="space-y-4 text-base text-[#1A1A1A]">
              <div className="rounded-2xl border border-[#E8E5DE] p-4 space-y-1">
                <p style={{ fontWeight: 500 }}>{attestation.patient.name ?? 'Patient'}</p>
                <p className="text-[#5C5C5C]">
                  Voyage du {formatDateFr(attestation.travel.departure_date)} au{' '}
                  {formatDateFr(attestation.travel.return_date)}
                  {attestation.travel.destination ? ` — ${attestation.travel.destination}` : ''}
                </p>
                {attestation.device && (
                  <p className="text-[#5C5C5C]">
                    Appareil : {[attestation.device.manufacturer, attestation.device.model]
                      .filter(Boolean)
                      .join(' ')}
                    {attestation.device.serial_number
                      ? ` (n° de série ${attestation.device.serial_number})`
                      : ''}
                  </p>
                )}
              </div>
              {attestation.regulatory_text.map((paragraph, i) => (
                <p key={i} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
              <p className="text-[#5C5C5C]">
                Document généré le {formatDateFr(attestation.issued_at)} depuis votre
                espace patient.
              </p>
              <button
                onClick={() => window.print()}
                className="w-full h-12 rounded-2xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors inline-flex items-center justify-center gap-2"
                style={{ fontWeight: 500 }}
              >
                <Printer className="w-5 h-5" />
                Imprimer
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zone print-only : seule l'attestation sélectionnée s'imprime */}
      {attestation && (
        <div className="hidden print:block bg-white text-black p-10">
          <h1 className="text-2xl mb-1" style={{ fontWeight: 600 }}>
            Attestation de voyage — dispositif médical
          </h1>
          <p className="text-base mb-8">
            Traitement par pression positive continue (PPC)
          </p>

          <p className="text-base mb-2">
            <strong>Patient :</strong> {attestation.patient.name ?? '—'}
          </p>
          <p className="text-base mb-2">
            <strong>Voyage :</strong> du {formatDateFr(attestation.travel.departure_date)} au{' '}
            {formatDateFr(attestation.travel.return_date)}
            {attestation.travel.destination ? ` — ${attestation.travel.destination}` : ''}
          </p>
          {attestation.device && (
            <p className="text-base mb-6">
              <strong>Appareil :</strong>{' '}
              {[attestation.device.manufacturer, attestation.device.model]
                .filter(Boolean)
                .join(' ') || 'Appareil de PPC'}
              {attestation.device.serial_number
                ? ` — n° de série ${attestation.device.serial_number}`
                : ''}
            </p>
          )}

          {attestation.regulatory_text.map((paragraph, i) => (
            <p key={i} className="text-base mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))}

          <p className="text-base mt-10">
            Document généré le {formatDateFr(attestation.issued_at)} via l'espace
            patient. Pour toute vérification, contactez le prestataire de santé à
            domicile du patient.
          </p>
        </div>
      )}
    </div>
  );
}
