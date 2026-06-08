/**
 * NEWSLETTER SIGNUP — petit bloc vitrine (visiteurs anonymes).
 *
 * Email + bouton → POST /public/newsletter/subscribe (apiPublic, anon key).
 * Confirmation sobre, mention désinscription. Aucune donnée de santé
 * demandée — juste un email.
 */

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { apiPublic } from '../../utils/api';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Indiquez votre adresse email.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      await apiPublic('/public/newsletter/subscribe', {
        method: 'POST',
        body: { email: value },
      });
      setDone(true);
    } catch (err: any) {
      setError(
        err?.status === 400
          ? 'Cette adresse email ne semble pas valide.'
          : 'L\'inscription n\'a pas fonctionné. Réessayez dans un instant.',
      );
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-[#F2F0EB] px-5 py-4">
        <p className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
          Merci, votre inscription est prise en compte.
        </p>
        <p className="text-base text-[#5C5C5C] mt-1 leading-relaxed">
          Vous recevrez nos conseils sur le sommeil et la PPC. Vous pourrez
          vous désinscrire à tout moment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-[#007AFF]" />
        <p className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
          Recevez nos conseils sommeil et PPC
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Votre adresse email
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre adresse email"
          autoComplete="email"
          className="h-12 flex-1 rounded-xl border border-[#E8E5DE] bg-white px-4 text-base text-[#1A1A1A] placeholder:text-[#9A9890] focus:outline-none focus:border-[#007AFF]"
        />
        <button
          type="submit"
          disabled={sending}
          className="h-12 px-6 rounded-xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
          style={{ fontWeight: 500 }}
        >
          {sending ? 'Inscription…' : 'M\'inscrire'}
        </button>
      </div>
      {error && <p className="text-base text-[#B4543A] mt-2">{error}</p>}
      <p className="text-base text-[#5C5C5C] mt-2 leading-relaxed">
        Un email de temps en temps, jamais de publicité. Lien de désinscription
        dans chaque envoi.
      </p>
    </form>
  );
}
