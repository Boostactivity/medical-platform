import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { CREATE_PRESTATAIRE_TABLES_SQL } from '../constants/sql-scripts';

interface CheckResult {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function SetupPrestataire() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { name: 'Tables alerts', status: 'checking', message: 'Vérification...' },
    { name: 'Tables interventions', status: 'checking', message: 'Vérification...' },
    { name: 'Tables audit_logs', status: 'checking', message: 'Vérification...' },
    { name: 'Realtime alerts', status: 'checking', message: 'Vérification...' },
    { name: 'Realtime interventions', status: 'checking', message: 'Vérification...' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runChecks();
    // Auto-copy SQL script on page load
    setTimeout(() => {
      copyToClipboard();
    }, 500);
  }, []);

  const runChecks = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      toast.error('Token manquant - Connectez-vous d\'abord');
      setLoading(false);
      return;
    }

    const projectId = 'ilskgkcbqnyydetsiwvi';
    const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

    // Check alerts table
    try {
      const res = await fetch(`${API_BASE}/prestataire/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        updateCheck('Tables alerts', 'success', 'Table alerts existe ✅');
      } else {
        const error = await res.json();
        if (error.details?.includes('does not exist') || error.error?.includes('does not exist')) {
          updateCheck('Tables alerts', 'error', 'Table alerts n\'existe pas ❌', 'Utilisez la correction automatique');
        } else if (error.details?.includes('PGRST200') || error.details?.includes('relationship')) {
          updateCheck('Tables alerts', 'error', 'Schéma incorrect (foreign keys) ❌', 'Les FK pointent vers auth.users au lieu de public.users');
        } else {
          updateCheck('Tables alerts', 'warning', 'Erreur API', JSON.stringify(error));
        }
      }
    } catch (err: any) {
      updateCheck('Tables alerts', 'error', 'Erreur réseau', err.message);
    }

    // Check interventions table
    try {
      const res = await fetch(`${API_BASE}/prestataire/interventions?status=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        updateCheck('Tables interventions', 'success', 'Table interventions existe ✅');
      } else {
        const error = await res.json();
        if (error.details?.includes('does not exist') || error.error?.includes('does not exist')) {
          updateCheck('Tables interventions', 'error', 'Table interventions n\'existe pas ❌', 'Utilisez la correction automatique');
        } else if (error.details?.includes('PGRST200') || error.details?.includes('relationship')) {
          updateCheck('Tables interventions', 'error', 'Schéma incorrect (foreign keys) ❌', 'Les FK pointent vers auth.users au lieu de public.users');
        } else {
          updateCheck('Tables interventions', 'warning', 'Erreur API', JSON.stringify(error));
        }
      }
    } catch (err: any) {
      updateCheck('Tables interventions', 'error', 'Erreur réseau', err.message);
    }

    // Note: audit_logs check would require a specific endpoint
    updateCheck('Tables audit_logs', 'warning', 'Non vérifié', 'Sera créé par le script SQL');

    // Realtime checks (these require tables to exist first)
    updateCheck('Realtime alerts', 'warning', 'À activer manuellement', 'Database → Replication dans Supabase');
    updateCheck('Realtime interventions', 'warning', 'À activer manuellement', 'Database → Replication dans Supabase');

    setLoading(false);
  };

  const updateCheck = (name: string, status: CheckResult['status'], message: string, details?: string) => {
    setChecks(prev => prev.map(check => 
      check.name === name ? { ...check, status, message, details } : check
    ));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(CREATE_PRESTATAIRE_TABLES_SQL);
      toast.success('Script SQL copié dans le presse-papier !');
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  const autoFix = async () => {
    setLoading(true);
    console.log('[AUTO-FIX] ========================================');
    console.log('[AUTO-FIX] 🔧 Starting automatic table recreation...');
    console.log('[AUTO-FIX] ========================================');
    toast.info('🔧 Correction automatique en cours... (cela peut prendre 10-15 secondes)');
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Token manquant - Connectez-vous d\'abord');
        return;
      }

      const projectId = 'ilskgkcbqnyydetsiwvi';
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

      console.log('[AUTO-FIX] Calling /setup/reset-and-recreate-tables...');
      const res = await fetch(`${API_BASE}/setup/reset-and-recreate-tables`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      console.log('[AUTO-FIX] Response:', data);

      if (res.ok && data.success) {
        console.log('[AUTO-FIX] ✅ SUCCESS!');
        console.log('[AUTO-FIX] Tables created:', data.details?.tables);
        console.log('[AUTO-FIX] Foreign keys:', data.details?.foreign_keys);
        toast.success('✅ Tables créées avec succès ! Schéma corrigé.');
        // Wait a bit for schema cache to update
        setTimeout(() => {
          console.log('[AUTO-FIX] Re-running checks...');
          runChecks();
        }, 3000);
      } else {
        console.error('[AUTO-FIX] ❌ FAILED:', data);
        toast.error(`Erreur: ${data.error || 'Échec de la correction automatique'}`);
      }
    } catch (error: any) {
      console.error('[AUTO-FIX] ❌ Exception:', error);
      toast.error('Erreur lors de la correction automatique');
    } finally {
      setLoading(false);
    }
  };

  const allTablesExist = checks
    .filter(c => c.name.startsWith('Tables'))
    .every(c => c.status === 'success');

  const hasTableErrors = checks
    .filter(c => c.name.startsWith('Tables'))
    .some(c => c.status === 'error');

  const hasForeignKeyErrors = checks
    .filter(c => c.name.startsWith('Tables'))
    .some(c => c.status === 'error' && c.details?.includes('auth.users'));

  return (
    <div className="min-h-screen bg-[#F5F5F7] py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl mb-4">
            <span className="text-white text-2xl">⚙️</span>
          </div>
          <h1 className="text-3xl text-[#1D1D1F] mb-2">Configuration Système Prestataire</h1>
          <p className="text-[#86868B]">
            Vérification et création des tables nécessaires
          </p>
        </div>

        {/* Checks Results */}
        <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-[#1D1D1F]">État du système</h2>
            <button
              onClick={runChecks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Revérifier</span>
            </button>
          </div>

          <div className="space-y-4">
            {checks.map((check, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-[#F5F5F7] rounded-xl"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {check.status === 'checking' && (
                    <RefreshCw className="w-5 h-5 text-[#007AFF] animate-spin" />
                  )}
                  {check.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-[#34C759]" />
                  )}
                  {check.status === 'error' && (
                    <XCircle className="w-5 h-5 text-[#FF3B30]" />
                  )}
                  {check.status === 'warning' && (
                    <AlertCircle className="w-5 h-5 text-[#FF9500]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-1">{check.name}</h3>
                  <p className="text-sm text-[#86868B]">{check.message}</p>
                  {check.details && (
                    <p className="text-xs text-[#86868B] mt-1 font-mono bg-white px-2 py-1 rounded">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary */}
        {allTablesExist ? (
          <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-[#34C759] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-[#1D1D1F] font-medium mb-2">
                  ✅ Toutes les tables existent !
                </h3>
                <p className="text-sm text-[#86868B] mb-4">
                  Le système prestataire est correctement configuré. Il reste uniquement à activer Realtime.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="/dashboard-admin"
                    className="px-4 py-2 bg-[#34C759] text-white rounded-lg hover:bg-[#2DB04C] transition-colors text-sm"
                  >
                    Accéder au Dashboard
                  </a>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-[#007AFF] border border-[#007AFF] rounded-lg hover:bg-[#F5F5F7] transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Activer Realtime
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : hasTableErrors ? (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <XCircle className="w-6 h-6 text-[#FF3B30] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-[#1D1D1F] font-medium mb-2">
                  {hasForeignKeyErrors 
                    ? '⚠️ Schéma de base de données incorrect' 
                    : '❌ Tables manquantes détectées'}
                </h3>
                <p className="text-sm text-[#86868B] mb-4">
                  {hasForeignKeyErrors 
                    ? 'Les tables existent mais les foreign keys pointent vers auth.users au lieu de public.users. Erreur PGRST200 détectée.'
                    : 'Les tables alerts et/ou interventions n\'existent pas.'
                  }
                  {' '}Cliquez sur le bouton ci-dessous pour corriger automatiquement.
                </p>
                <button
                  onClick={autoFix}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#34C759] text-white rounded-xl hover:bg-[#2DB04C] transition-colors disabled:opacity-50 shadow-lg shadow-[#34C759]/20"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {hasForeignKeyErrors 
                      ? '🔧 Corriger le Schéma (Drop & Recreate)' 
                      : '🔧 Créer les Tables'}
                  </span>
                </button>
                {hasForeignKeyErrors && (
                  <p className="text-xs text-[#86868B] mt-3">
                    ⚠️ Cette opération va supprimer et recréer les tables alerts, interventions et audit_logs.
                    Toutes les données seront perdues.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Instructions */}
        {hasTableErrors && (
          <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6 mb-6">
            <h2 className="text-xl text-[#1D1D1F] mb-4">
              📋 Instructions pas à pas
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-2">
                    Copier le script SQL
                  </h3>
                  <p className="text-sm text-[#86868B] mb-3">
                    Cliquez sur le bouton ci-dessous pour copier le script de création des tables.
                  </p>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copier le script SQL
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-2">
                    Ouvrir Supabase Dashboard
                  </h3>
                  <p className="text-sm text-[#86868B] mb-3">
                    Ouvrez le SQL Editor dans votre projet Supabase.
                  </p>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir Supabase Dashboard
                  </a>
                  <p className="text-xs text-[#86868B] mt-2">
                    Puis : <strong>SQL Editor</strong> → <strong>New query</strong>
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-2">
                    Coller et exécuter
                  </h3>
                  <p className="text-sm text-[#86868B] mb-2">
                    Collez le script SQL copié (Ctrl+V / Cmd+V) et cliquez sur <strong>Run</strong>.
                  </p>
                  <div className="bg-[#F5F5F7] rounded-lg p-3 text-xs font-mono text-[#86868B] mb-2">
                    ✅ Tables prestataire créées avec succès !<br/>
                    📊 Tables: alerts, interventions, audit_logs<br/>
                    🔒 RLS activé avec policies pour admin/prestataire
                  </div>
                  <p className="text-xs text-[#86868B]">
                    Vous devriez voir ce message de succès après l'exécution.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-2">
                    Activer Realtime
                  </h3>
                  <p className="text-sm text-[#86868B] mb-2">
                    Dans Supabase Dashboard : <strong>Database</strong> → <strong>Replication</strong>
                  </p>
                  <div className="bg-[#F5F5F7] rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" disabled checked className="rounded" />
                      <code className="text-xs">alerts</code>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" disabled checked className="rounded" />
                      <code className="text-xs">interventions</code>
                    </label>
                  </div>
                  <p className="text-xs text-[#86868B] mt-2">
                    Cochez ces deux tables puis cliquez sur <strong>Save</strong>.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#34C759] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1D1D1F] font-medium mb-2">
                    Revérifier le système
                  </h3>
                  <p className="text-sm text-[#86868B] mb-3">
                    Une fois le script exécuté, cliquez sur "Revérifier" en haut de cette page.
                  </p>
                  <button
                    onClick={runChecks}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#34C759] text-white rounded-lg hover:bg-[#2DB04C] transition-colors text-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Revérifier maintenant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SQL Preview */}
        <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-[#1D1D1F]">Aperçu du script SQL</h2>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#007AFF] hover:bg-[#F5F5F7] rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copier
            </button>
          </div>
          <div className="bg-[#1D1D1F] rounded-xl p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
            <pre className="text-xs text-[#34C759] font-mono whitespace-pre-wrap">
              {CREATE_PRESTATAIRE_TABLES_SQL || 'Chargement...'}
            </pre>
          </div>
          <p className="text-xs text-[#86868B] mt-2">
            Fichier source : <code>/supabase/migrations/create-prestataire-tables.sql</code>
          </p>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#86868B]">
            Besoin d'aide ?{' '}
            <a href="/FIX_NETWORK_ERRORS.md" className="text-[#007AFF] hover:underline">
              Consultez le guide détaillé
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}