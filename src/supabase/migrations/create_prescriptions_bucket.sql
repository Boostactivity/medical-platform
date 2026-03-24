-- ============================================
-- PHASE 3.8 : ADMISSION & GED
-- Création du bucket de stockage pour les ordonnances
-- ============================================

-- Créer le bucket pour les prescriptions (fichiers privés)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Créer la table pour la gestion des documents patients
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('ordonnance', 'rapport', 'courrier', 'compte_rendu', 'autre')),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  CONSTRAINT valid_document_type CHECK (document_type IN ('ordonnance', 'rapport', 'courrier', 'compte_rendu', 'autre'))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_patient_documents_date ON patient_documents(uploaded_at DESC);

-- RLS pour la table patient_documents
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Politique : Les médecins et prestataires peuvent voir tous les documents
CREATE POLICY "Medecins_prestataires_view_documents" ON patient_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  );

-- Politique : Seuls les médecins et prestataires peuvent ajouter des documents
CREATE POLICY "Medecins_prestataires_insert_documents" ON patient_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  );

-- Politique : Seuls les médecins et prestataires peuvent supprimer des documents
CREATE POLICY "Medecins_prestataires_delete_documents" ON patient_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  );

-- Politique de stockage pour le bucket prescriptions
-- Les médecins et prestataires peuvent uploader
CREATE POLICY "Medecins_prestataires_upload_prescriptions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prescriptions'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  )
);

-- Les médecins et prestataires peuvent télécharger
CREATE POLICY "Medecins_prestataires_download_prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'prescriptions'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  )
);

-- Les médecins et prestataires peuvent supprimer
CREATE POLICY "Medecins_prestataires_delete_prescriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prescriptions'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medecin', 'prestataire', 'admin')
    )
  )
);

-- Commentaires pour la documentation
COMMENT ON TABLE patient_documents IS 'Table de gestion des documents patients (ordonnances, rapports, courriers)';
COMMENT ON COLUMN patient_documents.document_type IS 'Type de document : ordonnance, rapport, courrier, compte_rendu, autre';
COMMENT ON COLUMN patient_documents.file_url IS 'URL signée du fichier dans Supabase Storage';
