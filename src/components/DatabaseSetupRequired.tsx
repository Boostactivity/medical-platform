import { AlertCircle, Database, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DatabaseSetupRequiredProps {
  error?: string;
}

export function DatabaseSetupRequired({ error }: DatabaseSetupRequiredProps) {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- TABLES POUR SYSTÈME PRESTATAIRE
-- Copier-coller ce script dans Supabase SQL Editor
-- Script idempotent : peut être exécuté plusieurs fois sans erreur

-- 1. TABLE ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Trigger updated_at pour alerts
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_updated_at ON alerts;
CREATE TRIGGER alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_alerts_updated_at();

-- 2. TABLE INTERVENTIONS
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('installation', 'mask_change', 'maintenance', 'training', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  date TIMESTAMPTZ NOT NULL,
  duration TEXT,
  notes TEXT,
  material TEXT,
  material_used TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);

-- Trigger updated_at pour interventions
CREATE OR REPLACE FUNCTION update_interventions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interventions_updated_at ON interventions;
CREATE TRIGGER interventions_updated_at
BEFORE UPDATE ON interventions
FOR EACH ROW
EXECUTE FUNCTION update_interventions_updated_at();

-- 3. TABLE AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admin and prestataire can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can update alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can view all interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can insert interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can update interventions" ON interventions;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;

-- Policies pour alerts
CREATE POLICY "Admin and prestataire can view all alerts"
ON alerts FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

CREATE POLICY "Admin and prestataire can update alerts"
ON alerts FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

CREATE POLICY "Admin and prestataire can insert alerts"
ON alerts FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Policies pour interventions
CREATE POLICY "Admin and prestataire can view all interventions"
ON interventions FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

CREATE POLICY "Admin and prestataire can insert interventions"
ON interventions FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

CREATE POLICY "Admin and prestataire can update interventions"
ON interventions FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Policies pour audit_logs
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
  OR
  (auth.jwt()->>'role') = 'admin'
);

CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Tables créées avec succès !';
END $$;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    toast.success('Script SQL copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-2xl border border-[#D9D5CC] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#CE0500] to-[#B34000] p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl mb-2">Configuration de la base de données requise</h1>
                <p className="text-white/90">
                  Les tables nécessaires n'ont pas été trouvées dans votre base de données Supabase.
                </p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {error && (
            <div className="p-6 bg-[#CE0500]/5 border-b border-[#D9D5CC]">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#CE0500] mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-[#1A1A1A] mb-1">Erreur détectée :</p>
                  <pre className="text-xs text-[#5C5C5C] bg-white p-3 rounded-lg overflow-x-auto border border-[#D9D5CC]">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-6">
            <h2 className="text-xl text-[#1A1A1A] mb-4">📋 Instructions (5 minutes)</h2>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1A1A1A] mb-2">Ouvrir Supabase SQL Editor</h3>
                  <a
                    href="https://supabase.com/dashboard/project/nwpbrxxxwrutacixeuxq/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#18753C] text-white rounded-lg hover:bg-[#18753C] transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir SQL Editor
                  </a>
                  <p className="text-xs text-[#5C5C5C] mt-2">
                    Cela ouvrira une nouvelle requête dans votre projet Supabase
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1A1A1A] mb-2">Copier le script SQL</h3>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier le script
                      </>
                    )}
                  </button>
                  <div className="mt-3 bg-[#F2F0EB] rounded-lg p-4 max-h-48 overflow-y-auto border border-[#D9D5CC]">
                    <pre className="text-xs text-[#1A1A1A] whitespace-pre-wrap">
                      {sqlScript.substring(0, 500)}...
                      <span className="text-[#5C5C5C]"> (script complet copié)</span>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1A1A1A] mb-2">Coller et exécuter</h3>
                  <ol className="text-sm text-[#5C5C5C] space-y-1 list-decimal list-inside">
                    <li>Coller le script dans l'éditeur SQL (Ctrl+V / Cmd+V)</li>
                    <li>Cliquer sur le bouton "Run" ▶️ en haut à droite</li>
                    <li>Attendre le message "Success" ✅</li>
                  </ol>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1A1A1A] mb-2">Activer Realtime</h3>
                  <ol className="text-sm text-[#5C5C5C] space-y-1 list-decimal list-inside">
                    <li>Aller dans Database → Replication</li>
                    <li>Cocher ✅ "alerts" et ✅ "interventions"</li>
                    <li>Cliquer sur "Save"</li>
                  </ol>
                  <a
                    href="https://supabase.com/dashboard/project/nwpbrxxxwrutacixeuxq/database/replication"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-[#007AFF] hover:text-[#0051D5] text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir Replication
                  </a>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#18753C] text-white flex items-center justify-center text-sm">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1A1A1A] mb-2">Recharger l'application</h3>
                  <p className="text-sm text-[#5C5C5C] mb-2">
                    Une fois le script exécuté, rechargez cette page
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#18753C] text-white rounded-lg hover:bg-[#18753C] transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Recharger maintenant
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-[#F2F0EB] border-t border-[#D9D5CC]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#007AFF] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-[#1A1A1A] mb-1">💡 Besoin d'aide ?</p>
                <p className="text-[#5C5C5C]">
                  Le script SQL complet est également disponible dans <code className="px-2 py-0.5 bg-white rounded text-xs">/supabase/migrations/create-prestataire-tables.sql</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tables to be created */}
        <div className="mt-6 bg-white rounded-xl p-6 border border-[#D9D5CC]">
          <h3 className="text-sm text-[#5C5C5C] mb-3">Tables qui seront créées :</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
              <div className="w-2 h-2 rounded-full bg-[#007AFF]"></div>
              alerts
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
              <div className="w-2 h-2 rounded-full bg-[#007AFF]"></div>
              interventions
            </div>
            <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
              <div className="w-2 h-2 rounded-full bg-[#007AFF]"></div>
              audit_logs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}