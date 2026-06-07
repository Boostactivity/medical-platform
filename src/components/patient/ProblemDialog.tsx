/**
 * "J'ai un problème" — déclaration panne / masque / question.
 * Dialog simple, gros boutons, vouvoiement, POST /patient/tickets.
 * Le numéro du prestataire reste affiché (certains patients préfèrent appeler).
 */

import { useState } from 'react';
import { Phone, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { api } from '../../utils/api';

const PRESTATAIRE_PHONE_DISPLAY = '0 800 123 456';
const PRESTATAIRE_PHONE_TEL = '0800123456';

const TICKET_TYPES: Array<{ value: 'panne' | 'masque' | 'question'; label: string; hint: string }> = [
  { value: 'panne', label: 'Panne de l\'appareil', hint: 'La machine ne fonctionne pas normalement' },
  { value: 'masque', label: 'Problème de masque', hint: 'Gêne, fuite d\'air, masque abîmé' },
  { value: 'question', label: 'Une question', hint: 'Tout autre sujet' },
];

export function ProblemDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'panne' | 'masque' | 'question' | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => {
    setType(null);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!type) {
      toast.error('Choisissez d\'abord le type de problème.');
      return;
    }
    if (message.trim().length === 0) {
      toast.error('Décrivez votre problème en quelques mots.');
      return;
    }
    setSending(true);
    try {
      await api.post('/patient/tickets', { type, message: message.trim() });
      toast.success('Votre demande est envoyée. Votre prestataire va vous recontacter.');
      setOpen(false);
      reset();
    } catch {
      toast.error('L\'envoi n\'a pas fonctionné. Réessayez ou appelez votre prestataire.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button className="w-full h-14 rounded-2xl bg-white border-2 border-[#007AFF] text-[#007AFF] text-lg inline-flex items-center justify-center gap-3 hover:bg-[#007AFF]/5 transition-colors shadow-sm">
          <LifeBuoy className="w-6 h-6" />
          J'ai un problème
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1A1A1A]">
            Dites-nous ce qui se passe
          </DialogTitle>
          <DialogDescription className="text-base text-[#5C5C5C] leading-relaxed">
            Votre prestataire (la société qui s'occupe de votre appareil) recevra
            votre message et vous recontactera.
          </DialogDescription>
        </DialogHeader>

        {/* Type de problème — gros boutons accessibles */}
        <div className="space-y-2" role="radiogroup" aria-label="Type de problème">
          {TICKET_TYPES.map((t) => {
            const selected = type === t.value;
            return (
              <button
                key={t.value}
                role="radio"
                aria-checked={selected}
                onClick={() => setType(t.value)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-colors ${
                  selected
                    ? 'border-[#007AFF] bg-[#007AFF]/5'
                    : 'border-[#E8E5DE] bg-white hover:border-[#007AFF]/40'
                }`}
              >
                <span className="block text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                  {t.label}
                </span>
                <span className="block text-base text-[#5C5C5C]">{t.hint}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="problem-message" className="block text-base text-[#1A1A1A] mb-1.5">
            Décrivez le problème, avec vos mots
          </label>
          <Textarea
            id="problem-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Par exemple : la machine fait un bruit inhabituel depuis hier soir…"
            className="text-base rounded-2xl"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={sending}
          className="w-full h-13 min-h-12 rounded-2xl bg-[#007AFF] text-white text-lg hover:bg-[#0051D5] transition-colors disabled:opacity-60"
        >
          {sending ? 'Envoi en cours…' : 'Envoyer ma demande'}
        </button>

        {/* Téléphone prestataire toujours visible */}
        <div className="rounded-2xl bg-[#FAFAF7] border border-[#E8E5DE] p-4 flex items-start gap-3">
          <Phone className="w-6 h-6 text-[#007AFF] shrink-0 mt-0.5" />
          <p className="text-base text-[#1A1A1A] leading-relaxed">
            Besoin d'une réponse tout de suite ? Appelez votre prestataire au{' '}
            <a href={`tel:${PRESTATAIRE_PHONE_TEL}`} className="text-[#007AFF] underline whitespace-nowrap">
              {PRESTATAIRE_PHONE_DISPLAY}
            </a>{' '}
            (appel gratuit).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
