-- =============================================
-- PHASE 2 IOT: TRIGGERS AUTOMATIQUES
-- Calcul de score et création d'alertes
-- =============================================

-- ============================================
-- TRIGGER 1: CALCUL AUTOMATIQUE DU SCORE
-- ============================================

/**
 * Fonction: calculate_exp_air_score_trigger()
 * But: Calcule automatiquement le score Exp'Air à chaque nouvelle donnée sleep_data
 * Déclenché: AFTER INSERT sur sleep_data
 */
CREATE OR REPLACE FUNCTION calculate_exp_air_score_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_grade VARCHAR(3);
  v_trend VARCHAR(20) := 'stable';
  v_usage_score NUMERIC := 0;
  v_ahi_score NUMERIC := 0;
  v_leak_score NUMERIC := 0;
  v_mask_score NUMERIC := 0;
  v_previous_avg NUMERIC;
  v_criteria JSONB;
BEGIN
  -- ============================================
  -- 1. CRITÈRE USAGE (30 points max)
  -- Cible: ≥ 7h = excellent
  -- ============================================
  IF NEW.usage_hours >= 7 THEN
    v_usage_score := 30;
  ELSIF NEW.usage_hours >= 4 THEN
    -- Proportionnel entre 4h et 7h: 70-100% des points
    v_usage_score := 30 * (0.7 + (NEW.usage_hours - 4) / 3 * 0.3);
  ELSIF NEW.usage_hours >= 2 THEN
    -- 2-4h: proportionnel jusqu'à 70%
    v_usage_score := 30 * (NEW.usage_hours / 4) * 0.7;
  ELSE
    -- < 2h: score très faible
    v_usage_score := 30 * (NEW.usage_hours / 4) * 0.5;
  END IF;

  -- ============================================
  -- 2. CRITÈRE AHI (25 points max)
  -- Cible: < 5 = apnées contrôlées
  -- ============================================
  IF NEW.ahi < 5 THEN
    v_ahi_score := 25;
  ELSIF NEW.ahi < 15 THEN
    -- AHI 5-15: apnée légère résiduelle
    v_ahi_score := 25 * (1 - (NEW.ahi - 5) / 10 * 0.3);
  ELSIF NEW.ahi < 30 THEN
    -- AHI 15-30: apnée modérée
    v_ahi_score := 25 * (1 - (NEW.ahi - 5) / 25 * 0.6);
  ELSE
    -- AHI > 30: apnée sévère
    v_ahi_score := 25 * 0.2;
  END IF;

  -- ============================================
  -- 3. CRITÈRE LEAK (20 points max)
  -- Cible: < 24 L/min au 95ème percentile
  -- ============================================
  IF NEW.leak_95 < 10 THEN
    v_leak_score := 20;
  ELSIF NEW.leak_95 < 24 THEN
    -- 10-24 L/min: acceptable
    v_leak_score := 20 * (1 - (NEW.leak_95 - 10) / 14 * 0.3);
  ELSIF NEW.leak_95 < 40 THEN
    -- 24-40 L/min: important
    v_leak_score := 20 * (1 - (NEW.leak_95 - 10) / 30 * 0.6);
  ELSE
    -- > 40 L/min: excessif
    v_leak_score := 20 * 0.2;
  END IF;

  -- ============================================
  -- 4. CRITÈRE MASK FIT (10 points max)
  -- Cible: < 2 retraits masque/nuit
  -- ============================================
  IF COALESCE(NEW.mask_events, 0) <= 2 THEN
    v_mask_score := 10;
  ELSIF NEW.mask_events <= 5 THEN
    v_mask_score := 10 * 0.7;
  ELSIF NEW.mask_events <= 10 THEN
    v_mask_score := 10 * 0.4;
  ELSE
    v_mask_score := 10 * 0.2;
  END IF;

  -- Note: Pression (10 pts) et Consistance (5 pts) non calculables ici
  -- Total possible par trigger: 85 points sur 100
  -- Les 15 points restants nécessitent historique (via backend)

  -- ============================================
  -- 5. CALCUL SCORE TOTAL
  -- ============================================
  v_score := ROUND(v_usage_score + v_ahi_score + v_leak_score + v_mask_score);
  
  -- Clamp entre 0-100
  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  -- ============================================
  -- 6. CALCUL DU GRADE
  -- ============================================
  IF v_score >= 95 THEN v_grade := 'A+';
  ELSIF v_score >= 85 THEN v_grade := 'A';
  ELSIF v_score >= 70 THEN v_grade := 'B';
  ELSIF v_score >= 55 THEN v_grade := 'C';
  ELSIF v_score >= 40 THEN v_grade := 'D';
  ELSE v_grade := 'F';
  END IF;

  -- ============================================
  -- 7. CALCUL DU TREND (si données historiques)
  -- ============================================
  SELECT AVG(exp_air_score) INTO v_previous_avg
  FROM patient_stats
  WHERE patient_id = NEW.user_id
    AND date > NEW.date - INTERVAL '7 days'
    AND date < NEW.date
  LIMIT 7;

  IF v_previous_avg IS NOT NULL THEN
    IF v_score > v_previous_avg + 5 THEN
      v_trend := 'improving';
    ELSIF v_score < v_previous_avg - 5 THEN
      v_trend := 'declining';
    END IF;
  END IF;

  -- ============================================
  -- 8. CONSTRUCTION DU JSONB CRITERIA
  -- ============================================
  v_criteria := jsonb_build_object(
    'usage', jsonb_build_object(
      'score', ROUND(v_usage_score, 1),
      'max_score', 30,
      'percentage', ROUND((v_usage_score / 30) * 100),
      'status', CASE
        WHEN NEW.usage_hours >= 7 THEN 'excellent'
        WHEN NEW.usage_hours >= 4 THEN 'good'
        WHEN NEW.usage_hours >= 2 THEN 'fair'
        ELSE 'poor'
      END
    ),
    'ahi', jsonb_build_object(
      'score', ROUND(v_ahi_score, 1),
      'max_score', 25,
      'percentage', ROUND((v_ahi_score / 25) * 100),
      'status', CASE
        WHEN NEW.ahi < 5 THEN 'excellent'
        WHEN NEW.ahi < 15 THEN 'good'
        WHEN NEW.ahi < 30 THEN 'fair'
        ELSE 'poor'
      END
    ),
    'leak', jsonb_build_object(
      'score', ROUND(v_leak_score, 1),
      'max_score', 20,
      'percentage', ROUND((v_leak_score / 20) * 100),
      'status', CASE
        WHEN NEW.leak_95 < 10 THEN 'excellent'
        WHEN NEW.leak_95 < 24 THEN 'good'
        WHEN NEW.leak_95 < 40 THEN 'fair'
        ELSE 'poor'
      END
    ),
    'mask_fit', jsonb_build_object(
      'score', ROUND(v_mask_score, 1),
      'max_score', 10,
      'percentage', ROUND((v_mask_score / 10) * 100),
      'status', CASE
        WHEN COALESCE(NEW.mask_events, 0) <= 2 THEN 'excellent'
        WHEN NEW.mask_events <= 5 THEN 'good'
        WHEN NEW.mask_events <= 10 THEN 'fair'
        ELSE 'poor'
      END
    )
  );

  -- ============================================
  -- 9. INSERTION/UPDATE DANS patient_stats
  -- ============================================
  INSERT INTO patient_stats (
    patient_id,
    date,
    exp_air_score,
    grade,
    score_details,
    trend,
    previous_score
  )
  VALUES (
    NEW.user_id,
    NEW.date,
    v_score,
    v_grade,
    v_criteria,
    v_trend,
    v_previous_avg
  )
  ON CONFLICT (patient_id, date) DO UPDATE SET
    exp_air_score = EXCLUDED.exp_air_score,
    grade = EXCLUDED.grade,
    score_details = EXCLUDED.score_details,
    trend = EXCLUDED.trend,
    previous_score = EXCLUDED.previous_score,
    updated_at = NOW();

  RAISE NOTICE '[SCORE TRIGGER] Score calculé: % (grade: %) pour patient % le %', 
    v_score, v_grade, NEW.user_id, NEW.date;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_calculate_score ON sleep_data;
CREATE TRIGGER trigger_calculate_score
  AFTER INSERT OR UPDATE ON sleep_data
  FOR EACH ROW
  EXECUTE FUNCTION calculate_exp_air_score_trigger();

-- ============================================
-- TRIGGER 2: CRÉATION AUTOMATIQUE D'ALERTES
-- ============================================

/**
 * Fonction: create_smart_alerts_trigger()
 * But: Crée automatiquement des alertes basées sur les seuils critiques
 * Déclenché: AFTER INSERT sur patient_stats
 */
CREATE OR REPLACE FUNCTION create_smart_alerts_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_alert_type VARCHAR(50);
  v_severity VARCHAR(20);
  v_title TEXT;
  v_message TEXT;
  v_recommendation TEXT;
  v_context JSONB;
  v_suggested_actions JSONB;
  v_estimated_time INTEGER;
BEGIN
  -- ============================================
  -- ALERTE 1: SCORE CRITIQUE (< 40)
  -- ============================================
  IF NEW.exp_air_score < 40 THEN
    v_alert_type := 'SCORE_CRITIQUE';
    v_severity := 'critical';
    v_title := 'Score Exp''Air critique';
    v_message := format(
      'Le score du patient est tombé à %s/100 (grade %s)',
      NEW.exp_air_score,
      NEW.grade
    );
    v_recommendation := 'Contact téléphonique urgent pour vérifier l''état du patient et l''utilisation de l''appareil';
    v_suggested_actions := jsonb_build_array(
      jsonb_build_object('action', 'call_patient', 'label', 'Appeler le patient'),
      jsonb_build_object('action', 'schedule_visit', 'label', 'Planifier visite technique'),
      jsonb_build_object('action', 'contact_doctor', 'label', 'Informer le médecin prescripteur')
    );
    v_estimated_time := 30;
    
    INSERT INTO alerts_queue (
      type, severity, patient_id, title, message, recommendation,
      context, suggested_actions, estimated_time, status
    )
    VALUES (
      v_alert_type, v_severity, NEW.patient_id, v_title, v_message, v_recommendation,
      jsonb_build_object('score', NEW.exp_air_score, 'grade', NEW.grade, 'date', NEW.date),
      v_suggested_actions, v_estimated_time, 'new'
    );

    RAISE NOTICE '[ALERT TRIGGER] Alerte CRITIQUE créée pour patient % (score: %)', 
      NEW.patient_id, NEW.exp_air_score;
  END IF;

  -- ============================================
  -- ALERTE 2: TENDANCE DÉCLINANTE
  -- ============================================
  IF NEW.trend = 'declining' AND NEW.exp_air_score < 70 THEN
    v_alert_type := 'TENDANCE_DECLINANTE';
    v_severity := 'high';
    v_title := 'Détérioration progressive détectée';
    v_message := format(
      'Le score a baissé de %s points en 7 jours (actuellement %s/100)',
      COALESCE(NEW.previous_score - NEW.exp_air_score, 0),
      NEW.exp_air_score
    );
    v_recommendation := 'Analyse des données pour identifier la cause (problème masque, démotivation patient, etc.)';
    v_suggested_actions := jsonb_build_array(
      jsonb_build_object('action', 'review_data', 'label', 'Analyser les données détaillées'),
      jsonb_build_object('action', 'send_motivation', 'label', 'Envoyer message de motivation'),
      jsonb_build_object('action', 'check_equipment', 'label', 'Vérifier équipement')
    );
    v_estimated_time := 20;
    
    INSERT INTO alerts_queue (
      type, severity, patient_id, title, message, recommendation,
      context, suggested_actions, estimated_time, status
    )
    VALUES (
      v_alert_type, v_severity, NEW.patient_id, v_title, v_message, v_recommendation,
      jsonb_build_object('score', NEW.exp_air_score, 'trend', NEW.trend, 'date', NEW.date),
      v_suggested_actions, v_estimated_time, 'new'
    );

    RAISE NOTICE '[ALERT TRIGGER] Alerte TENDANCE créée pour patient % (trend: %)', 
      NEW.patient_id, NEW.trend;
  END IF;

  -- ============================================
  -- ALERTE 3: PROBLÈME D'OBSERVANCE (usage < 4h)
  -- ============================================
  IF (NEW.score_details->'usage'->>'status') = 'poor' THEN
    SELECT usage_hours INTO v_estimated_time
    FROM sleep_data
    WHERE user_id = NEW.patient_id AND date = NEW.date;

    v_alert_type := 'OBSERVANCE_FAIBLE';
    v_severity := 'medium';
    v_title := 'Observance insuffisante';
    v_message := format(
      'Utilisation < 4h détectée (%.1fh constatées)',
      v_estimated_time
    );
    v_recommendation := 'Identifier les freins à l''utilisation (inconfort, claustrophobie, problèmes techniques)';
    v_suggested_actions := jsonb_build_array(
      jsonb_build_object('action', 'call_patient', 'label', 'Appel coaching'),
      jsonb_build_object('action', 'adjust_mask', 'label', 'Proposition changement masque'),
      jsonb_build_object('action', 'education', 'label', 'Envoyer vidéos éducatives')
    );
    v_estimated_time := 15;
    
    INSERT INTO alerts_queue (
      type, severity, patient_id, title, message, recommendation,
      context, suggested_actions, estimated_time, status
    )
    VALUES (
      v_alert_type, v_severity, NEW.patient_id, v_title, v_message, v_recommendation,
      jsonb_build_object('usage_hours', v_estimated_time, 'date', NEW.date),
      v_suggested_actions, v_estimated_time, 'new'
    );
  END IF;

  -- ============================================
  -- ALERTE 4: FUITES EXCESSIVES (leak > 24 L/min)
  -- ============================================
  IF (NEW.score_details->'leak'->>'status') IN ('fair', 'poor') THEN
    SELECT leak_95 INTO v_estimated_time
    FROM sleep_data
    WHERE user_id = NEW.patient_id AND date = NEW.date;

    v_alert_type := 'FUITES_EXCESSIVES';
    v_severity := 'medium';
    v_title := 'Fuites masque importantes';
    v_message := format(
      'Fuite 95%%ile: %.1f L/min (seuil: 24 L/min)',
      v_estimated_time
    );
    v_recommendation := 'Vérifier ajustement du masque ou proposer changement de taille/modèle';
    v_suggested_actions := jsonb_build_array(
      jsonb_build_object('action', 'schedule_fitting', 'label', 'RDV ajustement masque'),
      jsonb_build_object('action', 'send_tutorial', 'label', 'Envoyer tuto ajustement'),
      jsonb_build_object('action', 'order_replacement', 'label', 'Commander nouveau masque')
    );
    v_estimated_time := 25;
    
    INSERT INTO alerts_queue (
      type, severity, patient_id, title, message, recommendation,
      context, suggested_actions, estimated_time, status
    )
    VALUES (
      v_alert_type, v_severity, NEW.patient_id, v_title, v_message, v_recommendation,
      jsonb_build_object('leak_95', v_estimated_time, 'date', NEW.date),
      v_suggested_actions, v_estimated_time, 'new'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_create_smart_alerts ON patient_stats;
CREATE TRIGGER trigger_create_smart_alerts
  AFTER INSERT OR UPDATE ON patient_stats
  FOR EACH ROW
  EXECUTE FUNCTION create_smart_alerts_trigger();

-- ============================================
-- TRIGGER 3: AUDIT LOG (traçabilité RGPD)
-- ============================================

CREATE OR REPLACE FUNCTION audit_iot_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    action_type,
    user_id,
    resource_type,
    resource_id,
    metadata,
    ip_address
  )
  VALUES (
    TG_OP,
    auth.uid(),
    'sleep_data',
    NEW.id,
    jsonb_build_object(
      'patient_id', NEW.user_id,
      'date', NEW.date,
      'manufacturer', NEW.manufacturer
    ),
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_sleep_data ON sleep_data;
CREATE TRIGGER trigger_audit_sleep_data
  AFTER INSERT OR UPDATE ON sleep_data
  FOR EACH ROW
  EXECUTE FUNCTION audit_iot_data_access();

-- ============================================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_exp_air_score_trigger() IS 
  'Calcule automatiquement le score Exp''Air (0-100) à chaque nouvelle donnée PPC. 
  Critères: Usage (30pts), AHI (25pts), Leak (20pts), Mask Fit (10pts).
  Total possible: 85 points (15 points restants nécessitent historique via backend)';

COMMENT ON FUNCTION create_smart_alerts_trigger() IS 
  'Crée automatiquement des alertes intelligentes basées sur 4 conditions:
  1. Score < 40 (critique)
  2. Tendance déclinante + score < 70
  3. Usage < 4h (observance)
  4. Fuites > 24 L/min';

COMMENT ON FUNCTION audit_iot_data_access() IS 
  'Traçabilité RGPD pour toutes les opérations sur sleep_data';

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

-- Optimisation requêtes de score
CREATE INDEX IF NOT EXISTS idx_sleep_data_user_date ON sleep_data(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_data_ahi ON sleep_data(ahi) WHERE ahi > 15;
CREATE INDEX IF NOT EXISTS idx_sleep_data_usage ON sleep_data(usage_hours) WHERE usage_hours < 4;

-- Optimisation alerts
CREATE INDEX IF NOT EXISTS idx_alerts_queue_type_status ON alerts_queue(type, status);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_severity_date ON alerts_queue(severity, created_at DESC);
