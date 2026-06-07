import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Shield, Smartphone, Key, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const supabase = createClient();

export function MFASetup() {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'complete'>('intro');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Générer le QR Code pour l'authentificateur
  const generateMFA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Exp\'Air Medical Authenticator',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('setup');
        toast.success('QR Code généré avec succès');
      }
    } catch (error: any) {
      console.error('MFA enrollment error:', error);
      toast.error('Erreur lors de la configuration MFA');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier le code TOTP
  const verifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Code invalide (6 chiffres requis)');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (error) throw error;

      if (data) {
        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
          factorId: factorId,
          challengeId: data.id,
          code: verificationCode,
        });

        if (verifyError) throw verifyError;

        toast.success('Double authentification activée avec succès !');
        setStep('complete');
      }
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error('Code incorrect. Vérifiez votre authenticator.');
    } finally {
      setLoading(false);
    }
  };

  // Copier le secret dans le presse-papiers
  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      {/* STEP 1: Introduction */}
      {step === 'intro' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Sécurisez votre compte
          </h2>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            La <strong>double authentification (MFA)</strong> ajoute une couche de sécurité 
            supplémentaire à votre compte médical. Même si quelqu'un obtient votre mot de passe, 
            il ne pourra pas accéder à vos données sans votre téléphone.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Obligatoire pour les comptes médecin et administrateur
                </p>
                <p className="text-xs text-blue-700">
                  Conformité RGPD et HDS (Hébergement Données de Santé)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Protection contre le piratage de compte
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Conformité réglementaire santé
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Fonctionne hors ligne (pas besoin de SMS)
              </p>
            </div>
          </div>

          <button
            onClick={generateMFA}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Configuration en cours...' : 'Activer la double authentification'}
          </button>
        </div>
      )}

      {/* STEP 2: Setup (Scan QR Code) */}
      {step === 'setup' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Scannez le QR Code
            </h3>
          </div>

          <p className="text-gray-600 mb-6">
            Ouvrez une application d'authentification (Google Authenticator, Authy, Microsoft Authenticator, etc.) 
            et scannez ce QR Code :
          </p>

          {qrCode && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
              <div 
                className="mx-auto w-64 h-64 bg-white p-4 rounded-lg"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700 font-medium mb-2">
              Ou entrez ce code manuellement :
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-4 py-3 rounded-lg text-sm font-mono text-gray-900 border border-gray-200">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Copier"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            J'ai scanné le QR Code
          </button>
        </div>
      )}

      {/* STEP 3: Verify (Enter Code) */}
      {step === 'verify' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Vérification
            </h3>
          </div>

          <p className="text-gray-600 mb-6">
            Entrez le code à 6 chiffres généré par votre application d'authentification :
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code de vérification
            </label>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={verifyMFA}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Complete */}
      {step === 'complete' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Double authentification activée !
          </h2>

          <p className="text-gray-600 mb-6">
            Votre compte est maintenant protégé par la double authentification. 
            À chaque connexion, vous devrez entrer le code généré par votre application.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-green-800 font-medium mb-1">
                  Sécurité renforcée
                </p>
                <p className="text-xs text-green-700">
                  Vos données médicales sont maintenant protégées par 2 couches de sécurité
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Terminer
          </button>
        </div>
      )}
    </div>
  );
}

// Composant pour forcer le MFA au login
export function MFAChallenge({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Code invalide (6 chiffres requis)');
      return;
    }

    setLoading(true);
    try {
      // Récupérer les facteurs MFA
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (!factors || factors.totp.length === 0) {
        toast.error('Aucune MFA configurée');
        return;
      }

      const factorId = factors.totp[0].id;

      // Créer un challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      // Vérifier le code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) throw error;

      toast.success('Authentification réussie !');
      onSuccess();
    } catch (error: any) {
      console.error('MFA challenge error:', error);
      toast.error('Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentification requise
        </h2>
        <p className="text-sm text-gray-600">
          Entrez le code généré par votre application d'authentification
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-0"
          autoFocus
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Vérification...' : 'Vérifier'}
      </button>
    </div>
  );
}
