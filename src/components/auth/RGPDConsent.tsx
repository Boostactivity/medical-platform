/**
 * RGPD CONSENT - Consentement RGPD au premier login patient
 *
 * Affiche un popup de consentement granulaire conforme RGPD :
 * - Explication des donnees collectees
 * - Options de partage : medecin, prestataire
 * - Stockage dans Supabase (table consents)
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Shield, FileText, Eye, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient();

const CONSENT_VERSION = '1.0.0';

interface ConsentChoices {
  share_with_doctor: boolean;
  share_with_provider: boolean;
  data_collection: boolean;
}

interface RGPDConsentProps {
  userId: string;
  onConsented: () => void;
}

export function RGPDConsent({ userId, onConsented }: RGPDConsentProps) {
  const [choices, setChoices] = useState<ConsentChoices>({
    share_with_doctor: true,
    share_with_provider: true,
    data_collection: false,
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!choices.data_collection) {
      toast.error('Consentement requis', {
        description: 'Vous devez accepter la collecte de donnees pour utiliser la plateforme.',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('consents').insert({
        user_id: userId,
        version: CONSENT_VERSION,
        consent_date: new Date().toISOString(),
        data_collection: choices.data_collection,
        share_with_doctor: choices.share_with_doctor,
        share_with_provider: choices.share_with_provider,
        ip_address: null, // Server-side via RLS or Edge Function
      });

      if (error) {
        // If table doesn't exist yet, store locally and proceed
        console.warn('[RGPDConsent] Supabase insert error (table may not exist):', error.message);
        localStorage.setItem(`rgpd_consent_${userId}`, JSON.stringify({
          ...choices,
          version: CONSENT_VERSION,
          date: new Date().toISOString(),
        }));
      }

      toast.success('Consentement enregistre', {
        description: 'Vos preferences ont ete sauvegardees.',
      });
      onConsented();
    } catch (err) {
      console.error('[RGPDConsent] Error:', err);
      // Fallback to localStorage
      localStorage.setItem(`rgpd_consent_${userId}`, JSON.stringify({
        ...choices,
        version: CONSENT_VERSION,
        date: new Date().toISOString(),
      }));
      toast.success('Consentement enregistre localement');
      onConsented();
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Protection de vos donnees de sante
              </h2>
              <p className="text-sm text-gray-500">
                Conformite RGPD - Version {CONSENT_VERSION}
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Avant d'acceder a votre espace, nous devons obtenir votre consentement eclaire
            concernant le traitement de vos donnees de sante. Veuillez lire attentivement
            les informations ci-dessous.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Section 1: Data Collection */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('collection')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Donnees collectees</span>
              </div>
              <span className="text-gray-400">{expanded === 'collection' ? '-' : '+'}</span>
            </button>
            {expanded === 'collection' && (
              <div className="px-4 pb-4 text-sm text-gray-600 space-y-2">
                <p>La plateforme collecte les donnees suivantes dans le cadre de votre traitement PPC :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Donnees de sommeil :</strong> duree d'utilisation, qualite du sommeil, horaires</li>
                  <li><strong>Donnees d'observance :</strong> nombre d'heures d'utilisation par nuit, regularity</li>
                  <li><strong>Donnees machine :</strong> pression PPC, fuites masque, index apnee-hypopnee (IAH)</li>
                  <li><strong>Donnees de compte :</strong> nom, email, telephone, date de naissance</li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  Base legale : Consentement explicite (Art. 9.2.a RGPD) et necessite pour les soins de sante (Art. 9.2.h RGPD)
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Who has access */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('access')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Qui a acces a vos donnees</span>
              </div>
              <span className="text-gray-400">{expanded === 'access' ? '-' : '+'}</span>
            </button>
            {expanded === 'access' && (
              <div className="px-4 pb-4 text-sm text-gray-600 space-y-2">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Medecin prescripteur :</strong> Acces a vos donnees cliniques,
                      observance, IAH, et notes medicales pour le suivi de votre traitement.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Prestataire d'appareillage :</strong> Acces aux donnees techniques
                      (fuites, pression, heures d'utilisation) pour la maintenance et le reglage
                      de votre equipement PPC.
                    </div>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  Vos donnees sont hebergees sur un serveur certifie HDS (Hebergement Donnees de Sante).
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Your rights */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('rights')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Vos droits</span>
              </div>
              <span className="text-gray-400">{expanded === 'rights' ? '-' : '+'}</span>
            </button>
            {expanded === 'rights' && (
              <div className="px-4 pb-4 text-sm text-gray-600 space-y-2">
                <p>Conformement au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Droit d'acces a vos donnees personnelles</li>
                  <li>Droit de rectification des donnees inexactes</li>
                  <li>Droit a l'effacement (droit a l'oubli)</li>
                  <li>Droit a la portabilite de vos donnees</li>
                  <li>Droit de retirer votre consentement a tout moment</li>
                  <li>Droit d'introduire une reclamation aupres de la CNIL</li>
                </ul>
                <p className="mt-2">
                  Pour exercer vos droits, contactez le delegue a la protection des donnees
                  via la page Contact de la plateforme.
                </p>
              </div>
            )}
          </div>

          {/* Consent Toggles */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-900 mb-2">Vos choix de consentement</h3>

            {/* Mandatory: Data collection */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={choices.data_collection}
                onChange={(e) => setChoices({ ...choices, data_collection: e.target.checked })}
                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">
                  J'accepte la collecte de mes donnees de sante *
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Obligatoire pour utiliser la plateforme de suivi PPC
                </p>
              </div>
            </label>

            {/* Optional: Share with doctor */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={choices.share_with_doctor}
                onChange={(e) => setChoices({ ...choices, share_with_doctor: e.target.checked })}
                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">
                  Partage avec mon medecin prescripteur
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permet a votre medecin de suivre votre observance et vos donnees cliniques
                </p>
              </div>
            </label>

            {/* Optional: Share with provider */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={choices.share_with_provider}
                onChange={(e) => setChoices({ ...choices, share_with_provider: e.target.checked })}
                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">
                  Partage avec mon prestataire d'appareillage
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permet au prestataire d'acceder aux donnees techniques pour la maintenance
                </p>
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Sans le partage medecin, votre praticien ne pourra pas suivre votre traitement
              a distance. Vous pouvez modifier vos preferences a tout moment dans les parametres.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleAccept}
            disabled={!choices.data_collection || loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Enregistrement...'
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                J'accepte et je continue
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            En cliquant, vous confirmez avoir lu et compris les informations ci-dessus.
            Vous pouvez retirer votre consentement a tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour verifier si le consentement RGPD a ete donne
 */
export function useRGPDConsent(userId: string | undefined) {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkConsent = async () => {
      try {
        // Check Supabase first
        const { data, error } = await supabase
          .from('consents')
          .select('id')
          .eq('user_id', userId)
          .eq('version', CONSENT_VERSION)
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasConsented(true);
          setLoading(false);
          return;
        }

        // Fallback: check localStorage
        const localConsent = localStorage.getItem(`rgpd_consent_${userId}`);
        if (localConsent) {
          const parsed = JSON.parse(localConsent);
          if (parsed.version === CONSENT_VERSION && parsed.data_collection) {
            setHasConsented(true);
            setLoading(false);
            return;
          }
        }

        setHasConsented(false);
      } catch (err) {
        console.warn('[useRGPDConsent] Error checking consent:', err);
        // Fallback to localStorage
        const localConsent = localStorage.getItem(`rgpd_consent_${userId}`);
        setHasConsented(localConsent ? true : false);
      } finally {
        setLoading(false);
      }
    };

    checkConsent();
  }, [userId]);

  return { hasConsented, loading, setHasConsented };
}
