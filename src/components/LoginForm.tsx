'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { ProSanteConnectButton } from './ProSanteConnectButton';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormProps {
  userType: 'patient' | 'doctor' | 'admin';
  redirectTo: string;
}

/**
 * Mappe le userType du composant (patient/doctor/admin) vers le role DB (patient/medecin/admin).
 * Les pages Espace utilisent "doctor" mais la DB stocke "medecin".
 */
const userTypeToDbRole: Record<string, string[]> = {
  patient: ['patient'],
  doctor: ['medecin', 'infirmier'],
  admin: ['admin', 'prestataire'],
};

export function LoginForm({ userType, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, userRole, signOut } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError, needsMfa } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message || t('login.errorInvalid'));
        setLoading(false);
        return;
      }

      if (needsMfa) {
        // MFA sera gere par le ProtectedRoute / AuthContext
        navigate(redirectTo);
        return;
      }

      // Redirect to dashboard
      setTimeout(() => navigate(redirectTo), 300);
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue lors de la connexion');
      setLoading(false);
    }
  };

  const userTypeLabels: Record<string, string> = {
    patient: t('login.spacePatient'),
    doctor: t('login.spaceDoctor'),
    admin: t('login.spaceAdmin'),
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-light text-[#1a2b3c] mb-1 text-center tracking-tight">{t('login.title')}</h2>
        <p className="text-sm text-gray-400 text-center mb-8">{userTypeLabels[userType]}</p>

        {/* Bouton Pro Sante Connect - UNIQUEMENT pour les medecins */}
        {userType === 'doctor' && (
          <div className="mb-8">
            <ProSanteConnectButton
              size="large"
              className="w-full"
            />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-gray-400">
                  {t('login.orEmail')}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">
              {t('login.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="--------"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('login.loading')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>

          {/* Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">{t('login.demoAccounts')}</p>
            <div className="text-xs text-gray-400 text-center space-y-1">
              {userType === 'patient' && (
                <>
                  <p><strong className="text-gray-500">Patient :</strong> pierre.moreau@email.fr / Demo123!</p>
                  <p><strong className="text-gray-500">Patient :</strong> anne.lambert@email.fr / Demo123!</p>
                </>
              )}
              {userType === 'doctor' && (
                <>
                  <p><strong className="text-gray-500">Medecin :</strong> dr.martin@medconnect.fr / Demo123!</p>
                  <p><strong className="text-gray-500">Infirmier :</strong> inf.leroy@medconnect.fr / Demo123!</p>
                </>
              )}
              {userType === 'admin' && (
                <>
                  <p><strong className="text-gray-500">Admin :</strong> admin@medconnect.fr / Demo123!</p>
                  <p><strong className="text-gray-500">Prestataire :</strong> tech.dupuis@medconnect.fr / Demo123!</p>
                </>
              )}
            </div>

            {/* Help Section */}
            <div className="mt-4 space-y-2">
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[11px] text-blue-600 text-center">
                  {t('login.firstTime')}{' '}
                  <Link to="/setup-prestataire" className="text-blue-700 font-medium hover:underline">
                    {t('login.initButton')}
                  </Link>
                </p>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[11px] text-amber-600 text-center">
                  {t('login.authError')}{' '}
                  <Link to="/contact" className="text-amber-700 font-medium hover:underline">
                    {t('login.repairButton')}
                  </Link>
                  {' / '}
                  <Link to="/faq" className="text-amber-700 font-medium hover:underline">
                    {t('login.forceLogout')}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400">
            <button type="button" onClick={(e) => { e.preventDefault(); toast.info('Fonctionnalite a venir'); }} className="hover:text-blue-600 transition-colors">
              {t('login.forgotPassword')}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        {t('login.noAccount')}{' '}
        <Link to="/contact" className="text-blue-600 hover:text-blue-700 transition-colors">
          {t('login.contactUs')}
        </Link>
      </div>
    </div>
  );
}
