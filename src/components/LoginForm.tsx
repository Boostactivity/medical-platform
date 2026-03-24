'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { ProSanteConnectButton } from './ProSanteConnectButton';

interface LoginFormProps {
  userType: 'patient' | 'doctor' | 'admin';
  redirectTo: string;
}

export function LoginForm({ userType, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Email ou mot de passe incorrect');
        setLoading(false);
        return;
      }

      if (data.session) {
        // Get user metadata to check role
        const userRole = data.user?.user_metadata?.role;
        
        // Verify that the user role matches the login page type
        if (userRole !== userType) {
          setError(`Ce compte n'est pas un compte ${userTypeLabels[userType]}. ${!userRole ? 'Le rôle du compte n\'est pas défini. ' : ''}Visitez /fix-auth pour corriger.`);
          setLoading(false);
          toast.error('Accès refusé', {
            description: `Veuillez utiliser la page de connexion ${userTypeLabels[userRole] || 'appropriée'}.`,
          });
          // Sign out the user
          await supabase.auth.signOut();
          return;
        }
        
        // Store session
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('user_type', userType);
        localStorage.setItem('user_role', userRole);
        
        // Show success toast
        toast.success('Connexion réussie !', {
          description: 'Vous allez être redirigé vers votre espace.',
        });
        
        // Redirect to dashboard
        setTimeout(() => navigate(redirectTo), 500);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue lors de la connexion');
      toast.error('Erreur de connexion', {
        description: 'Veuillez vérifier vos identifiants.',
      });
      setLoading(false);
    }
  };

  const userTypeLabels = {
    patient: 'Patient',
    doctor: 'Médecin',
    admin: 'Administrateur',
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
        <h2 className="text-3xl text-[#1D1D1F] mb-2 text-center">Connexion</h2>
        <p className="text-[#86868B] text-center mb-8">Espace {userTypeLabels[userType]}</p>

        {/* Bouton Pro Santé Connect - UNIQUEMENT pour les médecins */}
        {userType === 'doctor' && (
          <div className="mb-8">
            <ProSanteConnectButton 
              size="large" 
              className="w-full"
            />
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#86868B]">
                  ou connectez-vous avec email
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[#1D1D1F] mb-2">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#007AFF] focus:bg-white transition-all outline-none"
                placeholder="votre.email@exemple.fr"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-[#1D1D1F] mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#007AFF] focus:bg-white transition-all outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#007AFF] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl text-[#FF3B30]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-[#86868B] text-center mb-4">Comptes de démonstration :</p>
            <div className="space-y-2 text-sm text-[#86868B]">
              {userType === 'patient' && (
                <p className="text-center">
                  <strong>Patient :</strong> testpatient@demo.fr / Test-123
                </p>
              )}
              
              {userType === 'doctor' && (
                <p className="text-center">
                  <strong>Médecin :</strong> testmedecin@demo.fr / Test-123
                </p>
              )}
              {userType === 'admin' && (
                <p className="text-center">
                  <strong>Admin :</strong> admin@demo.fr / Test-123
                </p>
              )}
            </div>
            
            {/* Help Section */}
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-[#007AFF]/10 border border-[#007AFF]/30 rounded-xl">
                <p className="text-xs text-[#1D1D1F] text-center">
                  Première utilisation ? Initialisez les comptes :{' '}
                  <Link to="/init-demo" className="text-[#007AFF] hover:underline">
                    Initialiser
                  </Link>
                </p>
              </div>
              
              <div className="p-3 bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-xl">
                <p className="text-xs text-[#1D1D1F] text-center">
                  Erreur "Forbidden" ? Réparez l'authentification :{' '}
                  <Link to="/fix-auth" className="text-[#FF9500] hover:underline">
                    Réparer
                  </Link>
                  {' ou '}
                  <Link to="/force-logout" className="text-[#FF9500] hover:underline">
                    Déconnexion forcée
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-[#86868B]">
            <button type="button" onClick={(e) => { e.preventDefault(); toast.info('Fonctionnalité à venir'); }} className="hover:text-[#007AFF] transition-colors">
              Mot de passe oublié ?
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center text-sm text-[#86868B]">
        Pas encore de compte ?{' '}
        <Link to="/contact" className="text-[#007AFF] hover:text-[#0051D5] transition-colors">
          Contactez-nous
        </Link>
      </div>
    </div>
  );
}