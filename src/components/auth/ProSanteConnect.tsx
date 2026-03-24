/**
 * PRO SANTE CONNECT - Composant d'authentification complet
 *
 * Flow OAuth2 : redirect vers PSC -> callback -> extraction RPPS -> login/creation compte
 * Style officiel ANS (Agence du Numerique en Sante)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, AlertCircle, User, MapPin, Stethoscope, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// ---- Types ----

interface PSCUserInfo {
  rpps: string;
  nom: string;
  prenom: string;
  specialite: string;
  lieuExercice: string;
  email?: string;
  typeExercice?: string;
  codePostal?: string;
}

interface PSCAuthState {
  status: 'idle' | 'redirecting' | 'processing' | 'verified' | 'error';
  userInfo: PSCUserInfo | null;
  errorMessage: string | null;
}

interface ProSanteConnectProps {
  onAuthSuccess?: (userInfo: PSCUserInfo) => void;
  onAuthError?: (error: string) => void;
  className?: string;
  compact?: boolean;
}

// ---- Configuration PSC ----

const PSC_CONFIG = {
  authorizationEndpoint: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/auth',
  tokenEndpoint: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/token',
  userInfoEndpoint: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/userinfo',
  clientId: import.meta.env.VITE_PSC_CLIENT_ID || 'psc-client-id',
  redirectUri: `${window.location.origin}/psc-callback`,
  scope: 'openid scope_all',
  responseType: 'code',
};

// ---- Helpers ----

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function validateRPPS(rpps: string): boolean {
  return /^\d{11}$/.test(rpps);
}

function isProfessionnelSante(userInfo: PSCUserInfo): boolean {
  // Verifier que le RPPS est valide et que la specialite est renseignee
  return validateRPPS(userInfo.rpps) && userInfo.specialite.length > 0;
}

// ---- Composant Principal ----

export function ProSanteConnect({ onAuthSuccess, onAuthError, className = '', compact = false }: ProSanteConnectProps) {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<PSCAuthState>({
    status: 'idle',
    userInfo: null,
    errorMessage: null,
  });

  const initiateOAuthFlow = useCallback(async () => {
    try {
      setAuthState({ status: 'redirecting', userInfo: null, errorMessage: null });

      // Generer state et PKCE
      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Stocker pour la verification au callback
      sessionStorage.setItem('psc_state', state);
      sessionStorage.setItem('psc_code_verifier', codeVerifier);
      sessionStorage.setItem('psc_initiated_at', Date.now().toString());

      // Construire l'URL d'autorisation
      const params = new URLSearchParams({
        response_type: PSC_CONFIG.responseType,
        client_id: PSC_CONFIG.clientId,
        redirect_uri: PSC_CONFIG.redirectUri,
        scope: PSC_CONFIG.scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        acr_values: 'eidas1',
      });

      const authUrl = `${PSC_CONFIG.authorizationEndpoint}?${params.toString()}`;

      toast.info('Redirection vers Pro Sante Connect...', {
        description: 'Vous allez etre redirige vers le portail d\'authentification ANS.',
      });

      // Redirection vers PSC
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('[PSC] Erreur lors de l\'initiation du flow OAuth:', error);
      setAuthState({
        status: 'error',
        userInfo: null,
        errorMessage: 'Impossible d\'initier l\'authentification PSC.',
      });
      onAuthError?.('Erreur technique lors de la connexion PSC');
      toast.error('Erreur PSC', {
        description: 'Impossible de se connecter a Pro Sante Connect.',
      });
    }
  }, [onAuthError]);

  const processCallback = useCallback(async (code: string, state: string) => {
    try {
      setAuthState({ status: 'processing', userInfo: null, errorMessage: null });

      // Verifier le state
      const savedState = sessionStorage.getItem('psc_state');
      if (state !== savedState) {
        throw new Error('Etat de securite invalide (CSRF protection)');
      }

      const codeVerifier = sessionStorage.getItem('psc_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier manquant');
      }

      // Echanger le code contre un token via notre backend
      const response = await fetch('/api/auth/psc/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: PSC_CONFIG.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'echange de token');
      }

      const tokenData = await response.json();

      // Recuperer les infos utilisateur
      const userInfoResponse = await fetch('/api/auth/psc/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Impossible de recuperer les informations utilisateur');
      }

      const pscUserInfo = await userInfoResponse.json();

      // Extraire et mapper les champs PSC
      const userInfo: PSCUserInfo = {
        rpps: pscUserInfo.SubjectNameID || pscUserInfo.preferred_username || '',
        nom: pscUserInfo.family_name || pscUserInfo.SubjectOrganization || '',
        prenom: pscUserInfo.given_name || '',
        specialite: pscUserInfo.SubjectRole?.[0]?.code || pscUserInfo.exercices?.[0]?.profession || '',
        lieuExercice: pscUserInfo.SubjectOrganization || pscUserInfo.exercices?.[0]?.lieuExercice || '',
        email: pscUserInfo.email || '',
        typeExercice: pscUserInfo.exercices?.[0]?.typeExercice || 'liberal',
        codePostal: pscUserInfo.exercices?.[0]?.codePostal || '',
      };

      // Verifier que c'est un professionnel de sante
      if (!isProfessionnelSante(userInfo)) {
        throw new Error('Votre profil PSC ne correspond pas a un professionnel de sante enregistre.');
      }

      // Creer ou connecter le compte
      const loginResponse = await fetch('/api/auth/psc/login-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInfo,
          accessToken: tokenData.access_token,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error('Erreur lors de la creation/connexion du compte');
      }

      const loginData = await loginResponse.json();

      // Stocker la session
      localStorage.setItem('access_token', loginData.accessToken);
      localStorage.setItem('user_type', 'doctor');
      localStorage.setItem('user_role', 'doctor');
      localStorage.setItem('psc_authenticated', 'true');
      localStorage.setItem('psc_rpps', userInfo.rpps);

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('psc_state');
      sessionStorage.removeItem('psc_code_verifier');
      sessionStorage.removeItem('psc_initiated_at');

      setAuthState({ status: 'verified', userInfo, errorMessage: null });

      toast.success('Authentification PSC reussie !', {
        description: `Bienvenue Dr ${userInfo.nom} (RPPS: ${userInfo.rpps})`,
      });

      onAuthSuccess?.(userInfo);

      // Redirection vers le dashboard medecin
      setTimeout(() => navigate('/dashboard-medecin'), 1500);
    } catch (error: any) {
      console.error('[PSC] Erreur callback:', error);
      setAuthState({
        status: 'error',
        userInfo: null,
        errorMessage: error.message || 'Erreur d\'authentification PSC',
      });
      onAuthError?.(error.message);
      toast.error('Erreur d\'authentification', { description: error.message });
    }
  }, [navigate, onAuthSuccess, onAuthError]);

  // ---- Rendu ----

  if (compact) {
    return (
      <button
        type="button"
        onClick={initiateOAuthFlow}
        disabled={authState.status === 'redirecting'}
        className={`
          flex items-center justify-center gap-3 w-full
          bg-white border-2 border-[#1E3A8A] text-[#1E3A8A]
          rounded-xl px-6 py-3
          hover:bg-[#1E3A8A] hover:text-white
          transition-all duration-300 shadow-md hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <div className="flex items-center justify-center w-8 h-8 bg-[#1E3A8A] rounded-full flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-75">S'identifier avec</span>
          <span className="font-semibold">Pro Sante Connect</span>
        </div>
      </button>
    );
  }

  return (
    <Card className={`border-[#1E3A8A]/20 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Pro Sante Connect</CardTitle>
            <CardDescription>Authentification officielle ANS pour les professionnels de sante</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Etat idle : Bouton de connexion */}
        {authState.status === 'idle' && (
          <>
            <button
              type="button"
              onClick={initiateOAuthFlow}
              className="flex items-center justify-center gap-3 w-full bg-[#1E3A8A] text-white rounded-xl px-6 py-4 hover:bg-[#162D6B] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Shield className="w-5 h-5" />
              <span className="font-semibold">Se connecter avec Pro Sante Connect</span>
            </button>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Numero RPPS verifie</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Identite certifiee</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Specialite importee</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Lieu d'exercice</span>
              </div>
            </div>
          </>
        )}

        {/* Etat redirection */}
        {authState.status === 'redirecting' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 border-4 border-[#1E3A8A]/30 border-t-[#1E3A8A] rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Redirection vers Pro Sante Connect...</p>
          </div>
        )}

        {/* Etat traitement */}
        {authState.status === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 border-4 border-[#1E3A8A]/30 border-t-[#1E3A8A] rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Verification de votre identite professionnelle...</p>
          </div>
        )}

        {/* Etat verifie : affichage des infos */}
        {authState.status === 'verified' && authState.userInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700 font-medium">Identite professionnelle verifiee</span>
            </div>
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">Dr {authState.userInfo.prenom} {authState.userInfo.nom}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-sm">RPPS : {authState.userInfo.rpps}</span>
                <Badge variant="outline" className="text-xs">Verifie</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{authState.userInfo.specialite}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{authState.userInfo.lieuExercice}</span>
              </div>
            </div>
          </div>
        )}

        {/* Etat erreur */}
        {authState.status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{authState.errorMessage}</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAuthState({ status: 'idle', userInfo: null, errorMessage: null })}
            >
              Reessayer
            </Button>
          </div>
        )}

        {/* Mention legale */}
        <p className="text-xs text-slate-400 text-center">
          Authentification securisee via l'Agence du Numerique en Sante (ANS).
          Vos donnees sont traitees conformement au RGPD.
        </p>
      </CardContent>
    </Card>
  );
}

export { type PSCUserInfo };
