/**
 * PAGE INIT SETUP - Initialisation des comptes de demonstration
 *
 * Accessible sur /init-setup
 * Permet de creer les comptes demo via l'API Supabase Auth (cote client).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { DEMO_ACCOUNTS, initAllDemoAccounts, type InitResult } from '../utils/initDemoAccounts';

type PageState = 'idle' | 'running' | 'done';

export function InitSetup() {
  const [state, setState] = useState<PageState>('idle');
  const [results, setResults] = useState<InitResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const handleInit = async () => {
    setState('running');
    setResults([]);
    setCurrentIndex(0);

    const allResults = await initAllDemoAccounts((result, index, _total) => {
      setResults((prev) => [...prev, result]);
      setCurrentIndex(index + 1);
    });

    setResults(allResults);
    setState('done');
  };

  const statusIcon = (status: InitResult['status']) => {
    switch (status) {
      case 'created':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'existing':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const statusLabel = (status: InitResult['status']) => {
    switch (status) {
      case 'created':
        return 'Cree';
      case 'existing':
        return 'Existant';
      case 'error':
        return 'Erreur';
    }
  };

  const createdCount = results.filter((r) => r.status === 'created').length;
  const existingCount = results.filter((r) => r.status === 'existing').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour a l'accueil
          </Link>
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">
            Initialisation des comptes demo
          </h1>
          <p className="text-slate-500 mt-2">
            Cette page cree les comptes de demonstration dans Supabase Auth et met a jour les profils.
          </p>
        </div>

        {/* Comptes a creer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-700">
              Comptes de demonstration ({DEMO_ACCOUNTS.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {DEMO_ACCOUNTS.map((account, index) => {
              const result = results[index];
              const isProcessing = state === 'running' && currentIndex === index;

              return (
                <div
                  key={account.email}
                  className={`flex items-center justify-between px-5 py-3 ${
                    isProcessing ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result ? (
                      statusIcon(result.status)
                    ) : isProcessing ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-800">{account.email}</p>
                      <p className="text-xs text-slate-400">
                        {account.prenom} {account.nom} - {account.role}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {result ? (
                      <div>
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            result.status === 'created'
                              ? 'bg-emerald-100 text-emerald-700'
                              : result.status === 'existing'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {statusLabel(result.status)}
                        </span>
                        {result.status === 'error' && (
                          <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                            {result.message}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">En attente</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resultats resume */}
        {state === 'done' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Resultat</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-semibold text-emerald-600">{createdCount}</p>
                <p className="text-xs text-emerald-500">Crees</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-2xl font-semibold text-amber-600">{existingCount}</p>
                <p className="text-xs text-amber-500">Existants</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-semibold text-red-600">{errorCount}</p>
                <p className="text-xs text-red-500">Erreurs</p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton d'action */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleInit}
            disabled={state === 'running'}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initialisation en cours... ({currentIndex}/{DEMO_ACCOUNTS.length})
              </>
            ) : state === 'done' ? (
              <>
                <Play className="w-4 h-4" />
                Relancer l'initialisation
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Initialiser les comptes demo
              </>
            )}
          </button>

          {state === 'done' && (
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">
                Mot de passe pour tous les comptes : <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">Demo123!</code>
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/espace-patient"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Espace Patient
                </Link>
                <Link
                  to="/espace-medecin"
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Espace Medecin
                </Link>
                <Link
                  to="/espace-admin"
                  className="text-sm text-amber-600 hover:underline"
                >
                  Espace Admin
                </Link>
                <Link
                  to="/auth/login"
                  className="text-sm text-violet-600 hover:underline"
                >
                  Login generique
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InitSetup;
