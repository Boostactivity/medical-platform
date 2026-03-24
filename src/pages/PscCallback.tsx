/**
 * ═══════════════════════════════════════════════════════════════════
 * PSC CALLBACK - Page de retour après authentification PSC
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Cette page gère le retour du médecin après authentification via
 * Pro Santé Connect. Elle récupère le token de session et redirige
 * vers le dashboard médecin.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function PscCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Authentification en cours...');

  useEffect(() => {
    const processCallback = async () => {
      // Vérifier si PSC a retourné une erreur
      const error = searchParams.get('error');
      const errorDetails = searchParams.get('details');

      if (error) {
        console.error('[PSC Callback] Error from PSC:', error, errorDetails);
        setStatus('error');
        setMessage(getErrorMessage(error, errorDetails));
        toast.error('Erreur d\'authentification PSC', {
          description: getErrorMessage(error, errorDetails),
        });
        
        // Rediriger vers login après 5 secondes
        setTimeout(() => navigate('/login-medecin'), 5000);
        return;
      }

      // Vérifier si on a un token de session
      const sessionToken = searchParams.get('session');
      
      if (!sessionToken) {
        console.error('[PSC Callback] No session token received');
        setStatus('error');
        setMessage('Aucun token de session reçu. Veuillez réessayer.');
        toast.error('Erreur de session', {
          description: 'Impossible de créer votre session. Veuillez réessayer.',
        });
        
        setTimeout(() => navigate('/login-medecin'), 5000);
        return;
      }

      // Valider le token de session auprès du backend
      try {
        setMessage('Validation de votre session PSC...');
        
        const response = await fetch(
          `${window.location.origin}/api/auth/psc/validate-session?token=${sessionToken}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          throw new Error('Session validation failed');
        }

        const data = await response.json();

        if (!data.valid) {
          throw new Error(data.error || 'Invalid session');
        }

        // Stocker les informations de session
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('user_type', 'doctor');
        localStorage.setItem('user_role', 'doctor');
        localStorage.setItem('psc_authenticated', 'true');

        setStatus('success');
        setMessage('Authentification réussie ! Redirection...');
        
        toast.success('Authentification PSC réussie !', {
          description: 'Bienvenue sur votre espace médecin.',
        });

        // Rediriger vers le dashboard médecin
        setTimeout(() => navigate('/dashboard-medecin'), 1500);
      } catch (error: any) {
        console.error('[PSC Callback] Session validation error:', error);
        setStatus('error');
        setMessage('Impossible de valider votre session. Veuillez réessayer.');
        toast.error('Erreur de validation', {
          description: error.message || 'Une erreur est survenue.',
        });
        
        setTimeout(() => navigate('/login-medecin'), 5000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  const getErrorMessage = (error: string | null, details: string | null): string => {
    const errorMessages: Record<string, string> = {
      'psc_auth_failed': 'L\'authentification PSC a échoué. Veuillez réessayer.',
      'missing_params': 'Paramètres manquants dans la réponse PSC.',
      'invalid_state': 'État de sécurité invalide. Possible attaque CSRF.',
      'no_token': 'Aucun token d\'accès reçu de PSC.',
      'callback_failed': 'Erreur lors du traitement de la réponse PSC.',
    };

    let message = errorMessages[error || ''] || 'Une erreur inconnue est survenue.';
    
    if (details) {
      message += ` (${decodeURIComponent(details)})`;
    }

    return message;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1E3A8A] to-[#0A0E27] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 max-w-md w-full">
        {/* Logo Pro Santé Connect */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-20 h-20 bg-[#1E3A8A] rounded-full">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              className="w-12 h-12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" 
                fill="white"
              />
              <path 
                d="M12 6L8 8V11.5C8 14.26 9.58 16.87 12 18C14.42 16.87 16 14.26 16 11.5V8L12 6Z" 
                fill="#1E3A8A"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl text-[#1D1D1F] mb-2 text-center">
          Pro Santé Connect
        </h2>

        {/* Status */}
        <div className="flex flex-col items-center gap-4 my-8">
          {status === 'loading' && (
            <>
              <LoadingSpinner size="large" />
              <div className="flex items-center gap-2 text-[#007AFF]">
                <AlertCircle className="w-5 h-5" />
                <p className="text-center">{message}</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-center text-green-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-red-600 mb-4">{message}</p>
                <button
                  onClick={() => navigate('/login-medecin')}
                  className="px-6 py-2 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all"
                >
                  Retour à la connexion
                </button>
              </div>
            </>
          )}
        </div>

        {/* Info PSC */}
        {status === 'loading' && (
          <div className="mt-8 p-4 bg-[#1E3A8A]/10 border border-[#1E3A8A]/30 rounded-xl">
            <p className="text-xs text-[#1D1D1F] text-center">
              Authentification sécurisée via l'Agence du Numérique en Santé (ANS)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
