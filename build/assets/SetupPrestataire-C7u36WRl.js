import{r as T,t as i,j as e,R as x,C as h,a as v,E as I,n as b}from"./index-DGTJtHcF.js";import{C as g}from"./circle-x-DRvD32Jf.js";const R=`-- ============================================
-- TABLES POUR SYSTÈME PRESTATAIRE
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- Script idempotent : peut être exécuté plusieurs fois sans erreur
-- ============================================

-- 1. TABLE ALERTS (Alertes patients)
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  
  -- Résolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Trigger pour updated_at
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

-- ============================================
-- 2. TABLE INTERVENTIONS (Interventions techniques)
-- ============================================

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  
  type TEXT NOT NULL CHECK (type IN ('installation', 'mask_change', 'maintenance', 'training', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Planification
  date TIMESTAMPTZ NOT NULL,
  duration TEXT,
  
  -- Détails
  notes TEXT,
  material TEXT,
  material_used TEXT,
  
  -- Complétion
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);

-- Trigger pour updated_at
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

-- ============================================
-- 3. TABLE AUDIT_LOGS (Logs d'audit RGPD)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
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

-- ALERTS POLICIES
-- ----------------

-- Admin/Prestataire can view all alerts
CREATE POLICY "Admin and prestataire can view all alerts"
ON alerts FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Admin/Prestataire can update alerts (resolve/ignore)
CREATE POLICY "Admin and prestataire can update alerts"
ON alerts FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Admin/Prestataire can insert alerts
CREATE POLICY "Admin and prestataire can insert alerts"
ON alerts FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- INTERVENTIONS POLICIES
-- -----------------------

-- Admin/Prestataire can view all interventions
CREATE POLICY "Admin and prestataire can view all interventions"
ON interventions FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Admin/Prestataire can create interventions
CREATE POLICY "Admin and prestataire can insert interventions"
ON interventions FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- Admin/Prestataire can update interventions
CREATE POLICY "Admin and prestataire can update interventions"
ON interventions FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin', 'prestataire')
  OR
  (auth.jwt()->>'role') IN ('admin', 'prestataire')
);

-- AUDIT LOGS POLICIES
-- --------------------

-- Admin can view all audit logs
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
  OR
  (auth.jwt()->>'role') = 'admin'
);

-- Any authenticated user can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérification des tables créées
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('alerts', 'interventions', 'audit_logs')
ORDER BY tablename;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Tables prestataire créées avec succès !';
  RAISE NOTICE '📊 Tables: alerts, interventions, audit_logs';
  RAISE NOTICE '🔒 RLS activé avec policies pour admin/prestataire';
  RAISE NOTICE '⚡ Prochaine étape: Activer Realtime dans Database -> Replication';
END $$;`;function F(){const[d,A]=T.useState([{name:"Tables alerts",status:"checking",message:"Vérification..."},{name:"Tables interventions",status:"checking",message:"Vérification..."},{name:"Tables audit_logs",status:"checking",message:"Vérification..."},{name:"Realtime alerts",status:"checking",message:"Vérification..."},{name:"Realtime interventions",status:"checking",message:"Vérification..."}]),[n,c]=T.useState(!1);T.useEffect(()=>{u(),setTimeout(()=>{E()},500)},[]);const u=async()=>{c(!0);const t=localStorage.getItem("access_token");if(!t){i.error("Token manquant - Connectez-vous d'abord"),c(!1);return}const l="https://ilskgkcbqnyydetsiwvi.supabase.co/functions/v1/make-server-50732e52";try{const a=await fetch(`${l}/prestataire/alerts`,{headers:{Authorization:`Bearer ${t}`}});if(a.ok)r("Tables alerts","success","Table alerts existe ✅");else{const s=await a.json();s.details?.includes("does not exist")||s.error?.includes("does not exist")?r("Tables alerts","error","Table alerts n'existe pas ❌","Utilisez la correction automatique"):s.details?.includes("PGRST200")||s.details?.includes("relationship")?r("Tables alerts","error","Schéma incorrect (foreign keys) ❌","Les FK pointent vers auth.users au lieu de public.users"):r("Tables alerts","warning","Erreur API",JSON.stringify(s))}}catch(a){r("Tables alerts","error","Erreur réseau",a.message)}try{const a=await fetch(`${l}/prestataire/interventions?status=all`,{headers:{Authorization:`Bearer ${t}`}});if(a.ok)r("Tables interventions","success","Table interventions existe ✅");else{const s=await a.json();s.details?.includes("does not exist")||s.error?.includes("does not exist")?r("Tables interventions","error","Table interventions n'existe pas ❌","Utilisez la correction automatique"):s.details?.includes("PGRST200")||s.details?.includes("relationship")?r("Tables interventions","error","Schéma incorrect (foreign keys) ❌","Les FK pointent vers auth.users au lieu de public.users"):r("Tables interventions","warning","Erreur API",JSON.stringify(s))}}catch(a){r("Tables interventions","error","Erreur réseau",a.message)}r("Tables audit_logs","warning","Non vérifié","Sera créé par le script SQL"),r("Realtime alerts","warning","À activer manuellement","Database → Replication dans Supabase"),r("Realtime interventions","warning","À activer manuellement","Database → Replication dans Supabase"),c(!1)},r=(t,o,l,a)=>{A(s=>s.map(p=>p.name===t?{...p,status:o,message:l,details:a}:p))},E=async()=>{try{await navigator.clipboard.writeText(R),i.success("Script SQL copié dans le presse-papier !")}catch{i.error("Erreur lors de la copie")}},S=async()=>{c(!0),console.log("[AUTO-FIX] ========================================"),console.log("[AUTO-FIX] 🔧 Starting automatic table recreation..."),console.log("[AUTO-FIX] ========================================"),i.info("🔧 Correction automatique en cours... (cela peut prendre 10-15 secondes)");try{const t=localStorage.getItem("access_token");if(!t){i.error("Token manquant - Connectez-vous d'abord");return}const l="https://ilskgkcbqnyydetsiwvi.supabase.co/functions/v1/make-server-50732e52";console.log("[AUTO-FIX] Calling /setup/reset-and-recreate-tables...");const a=await fetch(`${l}/setup/reset-and-recreate-tables`,{method:"POST",headers:{Authorization:`Bearer ${t}`}}),s=await a.json();console.log("[AUTO-FIX] Response:",s),a.ok&&s.success?(console.log("[AUTO-FIX] ✅ SUCCESS!"),console.log("[AUTO-FIX] Tables created:",s.details?.tables),console.log("[AUTO-FIX] Foreign keys:",s.details?.foreign_keys),i.success("✅ Tables créées avec succès ! Schéma corrigé."),setTimeout(()=>{console.log("[AUTO-FIX] Re-running checks..."),u()},3e3)):(console.error("[AUTO-FIX] ❌ FAILED:",s),i.error(`Erreur: ${s.error||"Échec de la correction automatique"}`))}catch(t){console.error("[AUTO-FIX] ❌ Exception:",t),i.error("Erreur lors de la correction automatique")}finally{c(!1)}},O=d.filter(t=>t.name.startsWith("Tables")).every(t=>t.status==="success"),N=d.filter(t=>t.name.startsWith("Tables")).some(t=>t.status==="error"),m=d.filter(t=>t.name.startsWith("Tables")).some(t=>t.status==="error"&&t.details?.includes("auth.users"));return e.jsx("div",{className:"min-h-screen bg-[#F5F5F7] py-12",children:e.jsxs("div",{className:"max-w-4xl mx-auto px-6",children:[e.jsxs("div",{className:"text-center mb-12",children:[e.jsx("div",{className:"inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl mb-4",children:e.jsx("span",{className:"text-white text-2xl",children:"⚙️"})}),e.jsx("h1",{className:"text-3xl text-[#1D1D1F] mb-2",children:"Configuration Système Prestataire"}),e.jsx("p",{className:"text-[#86868B]",children:"Vérification et création des tables nécessaires"})]}),e.jsxs("div",{className:"bg-white rounded-2xl border border-[#D2D2D7] p-6 mb-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsx("h2",{className:"text-xl text-[#1D1D1F]",children:"État du système"}),e.jsxs("button",{onClick:u,disabled:n,className:"flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors disabled:opacity-50",children:[e.jsx(x,{className:`w-4 h-4 ${n?"animate-spin":""}`}),e.jsx("span",{className:"text-sm",children:"Revérifier"})]})]}),e.jsx("div",{className:"space-y-4",children:d.map((t,o)=>e.jsxs("div",{className:"flex items-start gap-4 p-4 bg-[#F5F5F7] rounded-xl",children:[e.jsxs("div",{className:"flex-shrink-0 mt-0.5",children:[t.status==="checking"&&e.jsx(x,{className:"w-5 h-5 text-[#007AFF] animate-spin"}),t.status==="success"&&e.jsx(h,{className:"w-5 h-5 text-[#34C759]"}),t.status==="error"&&e.jsx(g,{className:"w-5 h-5 text-[#FF3B30]"}),t.status==="warning"&&e.jsx(v,{className:"w-5 h-5 text-[#FF9500]"})]}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-1",children:t.name}),e.jsx("p",{className:"text-sm text-[#86868B]",children:t.message}),t.details&&e.jsx("p",{className:"text-xs text-[#86868B] mt-1 font-mono bg-white px-2 py-1 rounded",children:t.details})]})]},o))})]}),O?e.jsx("div",{className:"bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-6 mb-6",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx(h,{className:"w-6 h-6 text-[#34C759] flex-shrink-0 mt-1"}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"✅ Toutes les tables existent !"}),e.jsx("p",{className:"text-sm text-[#86868B] mb-4",children:"Le système prestataire est correctement configuré. Il reste uniquement à activer Realtime."}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("a",{href:"/dashboard-admin",className:"px-4 py-2 bg-[#34C759] text-white rounded-lg hover:bg-[#2DB04C] transition-colors text-sm",children:"Accéder au Dashboard"}),e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 px-4 py-2 bg-white text-[#007AFF] border border-[#007AFF] rounded-lg hover:bg-[#F5F5F7] transition-colors text-sm",children:[e.jsx(I,{className:"w-4 h-4"}),"Activer Realtime"]})]})]})]})}):N?e.jsx("div",{className:"bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-6 mb-6",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx(g,{className:"w-6 h-6 text-[#FF3B30] flex-shrink-0 mt-1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:m?"⚠️ Schéma de base de données incorrect":"❌ Tables manquantes détectées"}),e.jsxs("p",{className:"text-sm text-[#86868B] mb-4",children:[m?"Les tables existent mais les foreign keys pointent vers auth.users au lieu de public.users. Erreur PGRST200 détectée.":"Les tables alerts et/ou interventions n'existent pas."," ","Cliquez sur le bouton ci-dessous pour corriger automatiquement."]}),e.jsxs("button",{onClick:S,disabled:n,className:"flex items-center gap-2 px-6 py-3 bg-[#34C759] text-white rounded-xl hover:bg-[#2DB04C] transition-colors disabled:opacity-50 shadow-lg shadow-[#34C759]/20",children:[e.jsx(x,{className:`w-5 h-5 ${n?"animate-spin":""}`}),e.jsx("span",{children:m?"🔧 Corriger le Schéma (Drop & Recreate)":"🔧 Créer les Tables"})]}),m&&e.jsx("p",{className:"text-xs text-[#86868B] mt-3",children:"⚠️ Cette opération va supprimer et recréer les tables alerts, interventions et audit_logs. Toutes les données seront perdues."})]})]})}):null,N&&e.jsxs("div",{className:"bg-white rounded-2xl border border-[#D2D2D7] p-6 mb-6",children:[e.jsx("h2",{className:"text-xl text-[#1D1D1F] mb-4",children:"📋 Instructions pas à pas"}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"flex gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium",children:"1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"Copier le script SQL"}),e.jsx("p",{className:"text-sm text-[#86868B] mb-3",children:"Cliquez sur le bouton ci-dessous pour copier le script de création des tables."}),e.jsxs("button",{onClick:E,className:"flex items-center gap-2 px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors text-sm",children:[e.jsx(b,{className:"w-4 h-4"}),"Copier le script SQL"]})]})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium",children:"2"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"Ouvrir Supabase Dashboard"}),e.jsx("p",{className:"text-sm text-[#86868B] mb-3",children:"Ouvrez le SQL Editor dans votre projet Supabase."}),e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors text-sm",children:[e.jsx(I,{className:"w-4 h-4"}),"Ouvrir Supabase Dashboard"]}),e.jsxs("p",{className:"text-xs text-[#86868B] mt-2",children:["Puis : ",e.jsx("strong",{children:"SQL Editor"})," → ",e.jsx("strong",{children:"New query"})]})]})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium",children:"3"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"Coller et exécuter"}),e.jsxs("p",{className:"text-sm text-[#86868B] mb-2",children:["Collez le script SQL copié (Ctrl+V / Cmd+V) et cliquez sur ",e.jsx("strong",{children:"Run"}),"."]}),e.jsxs("div",{className:"bg-[#F5F5F7] rounded-lg p-3 text-xs font-mono text-[#86868B] mb-2",children:["✅ Tables prestataire créées avec succès !",e.jsx("br",{}),"📊 Tables: alerts, interventions, audit_logs",e.jsx("br",{}),"🔒 RLS activé avec policies pour admin/prestataire"]}),e.jsx("p",{className:"text-xs text-[#86868B]",children:"Vous devriez voir ce message de succès après l'exécution."})]})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center text-sm font-medium",children:"4"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"Activer Realtime"}),e.jsxs("p",{className:"text-sm text-[#86868B] mb-2",children:["Dans Supabase Dashboard : ",e.jsx("strong",{children:"Database"})," → ",e.jsx("strong",{children:"Replication"})]}),e.jsxs("div",{className:"bg-[#F5F5F7] rounded-lg p-3 space-y-2",children:[e.jsxs("label",{className:"flex items-center gap-2 text-sm",children:[e.jsx("input",{type:"checkbox",disabled:!0,checked:!0,className:"rounded"}),e.jsx("code",{className:"text-xs",children:"alerts"})]}),e.jsxs("label",{className:"flex items-center gap-2 text-sm",children:[e.jsx("input",{type:"checkbox",disabled:!0,checked:!0,className:"rounded"}),e.jsx("code",{className:"text-xs",children:"interventions"})]})]}),e.jsxs("p",{className:"text-xs text-[#86868B] mt-2",children:["Cochez ces deux tables puis cliquez sur ",e.jsx("strong",{children:"Save"}),"."]})]})]}),e.jsxs("div",{className:"flex gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-[#34C759] text-white rounded-full flex items-center justify-center text-sm font-medium",children:"5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-[#1D1D1F] font-medium mb-2",children:"Revérifier le système"}),e.jsx("p",{className:"text-sm text-[#86868B] mb-3",children:'Une fois le script exécuté, cliquez sur "Revérifier" en haut de cette page.'}),e.jsxs("button",{onClick:u,disabled:n,className:"flex items-center gap-2 px-4 py-2 bg-[#34C759] text-white rounded-lg hover:bg-[#2DB04C] transition-colors text-sm disabled:opacity-50",children:[e.jsx(x,{className:`w-4 h-4 ${n?"animate-spin":""}`}),"Revérifier maintenant"]})]})]})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl border border-[#D2D2D7] p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-lg text-[#1D1D1F]",children:"Aperçu du script SQL"}),e.jsxs("button",{onClick:E,className:"flex items-center gap-2 px-3 py-1.5 text-sm text-[#007AFF] hover:bg-[#F5F5F7] rounded-lg transition-colors",children:[e.jsx(b,{className:"w-4 h-4"}),"Copier"]})]}),e.jsx("div",{className:"bg-[#1D1D1F] rounded-xl p-4 overflow-x-auto max-h-[400px] overflow-y-auto",children:e.jsx("pre",{className:"text-xs text-[#34C759] font-mono whitespace-pre-wrap",children:R})}),e.jsxs("p",{className:"text-xs text-[#86868B] mt-2",children:["Fichier source : ",e.jsx("code",{children:"/supabase/migrations/create-prestataire-tables.sql"})]})]}),e.jsx("div",{className:"mt-6 text-center",children:e.jsxs("p",{className:"text-sm text-[#86868B]",children:["Besoin d'aide ?"," ",e.jsx("a",{href:"/FIX_NETWORK_ERRORS.md",className:"text-[#007AFF] hover:underline",children:"Consultez le guide détaillé"})]})})]})})}export{F as SetupPrestataire};
