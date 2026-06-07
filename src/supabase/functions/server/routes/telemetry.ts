/**
 * Telemetry & data processing routes:
 * sleep data, gamification, normalization, FHIR, reports, tasks.
 * Mounted at the root prefix (heterogeneous paths), so requireAuth is
 * attached PER ROUTE — no app.use('*') here. No role restriction:
 * the original handlers had no role check — semantics preserved,
 * baseline auth added.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, type AuthEnv } from '../middleware/auth.ts';
import { analyzePatient } from '../alert-engine.ts';
import { updatePatientGamification, processNewNight } from '../gamification-engine.ts';
import { normalizeData, smartNormalize, StandardizedData } from '../adapters.ts';
import { patientToFHIR, telemetryToFHIR, deviceToFHIR, createFHIRBundle } from '../fhir.ts';
import { generateReportHTML, convertHTMLToPDF, type ReportData } from '../pdf-generator.ts';
import { createAutomaticTask, calculateDailyScore, saveTaskToDatabase, type Task } from '../task-engine.ts';

const app = new Hono<AuthEnv>();

// ============================================
// COMBINED WORKFLOW (Alert + Gamification)
// ============================================

app.post('/process-sleep-data', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { patientId, nightData } = body;

    if (!patientId || !nightData) {
      return c.json({ error: 'patientId and nightData required' }, 400);
    }

    console.log(`[SLEEP PROCESSOR] Processing sleep data for patient ${patientId}, date ${nightData.date}`);

    // 1. Sauvegarder les données dans observance_data
    const { error: insertError } = await supabase
      .from('observance_data')
      .upsert({
        patient_id: patientId,
        date: nightData.date,
        usage_hours: nightData.usage_hours || 0,
        leak_rate: nightData.leak_rate || 0,
        ahi: nightData.ahi || 0,
        pressure_95: nightData.pressure_95,
        mask_on_time: nightData.mask_on_time,
        mask_off_time: nightData.mask_off_time,
      }, { onConflict: 'patient_id,date' });

    if (insertError) {
      console.error('[SLEEP PROCESSOR] Error saving observance data:', insertError);
      return c.json({ error: 'Failed to save observance data' }, 500);
    }

    // 2. Mettre à jour la gamification
    const gamificationResult = await updatePatientGamification(patientId);

    // 3. Analyser et créer des alertes
    const alertResult = await analyzePatient(patientId);

    return c.json({
      success: true,
      patientId,
      date: nightData.date,
      gamification: {
        achievementsUnlocked: gamificationResult.achievementsUnlocked,
        stats: gamificationResult.stats,
      },
      alerts: {
        alertsCreated: alertResult.alertsCreated,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[SLEEP PROCESSOR] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// GAMIFICATION ENGINE ROUTES
// ============================================

app.post('/gamification/update/:patientId', requireAuth, async (c) => {
  try {
    const patientId = c.req.param('patientId');

    if (!patientId) {
      return c.json({ error: 'Patient ID required' }, 400);
    }

    console.log(`[GAMIFICATION API] Updating gamification for patient ${patientId}`);
    const result = await updatePatientGamification(patientId);

    return c.json({
      success: result.success,
      patientId,
      achievementsUnlocked: result.achievementsUnlocked,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GAMIFICATION API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/gamification/process-night', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { patientId, nightData } = body;

    if (!patientId || !nightData) {
      return c.json({ error: 'patientId and nightData required' }, 400);
    }

    console.log(`[GAMIFICATION API] Processing new night for patient ${patientId}`);
    await processNewNight(patientId, nightData);

    return c.json({
      success: true,
      patientId,
      date: nightData.date,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GAMIFICATION API] Error processing night:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// ROUTE : NORMALISATION DE DONNÉES MULTI-MARQUES
// ============================================

app.post('/normalize-device-data', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { rawData, brand } = body;

    if (!rawData) {
      return c.json({ error: 'Missing rawData' }, 400);
    }

    let normalized: StandardizedData;

    // Auto-détection ou marque spécifiée
    if (brand) {
      normalized = normalizeData(rawData, brand);
    } else {
      normalized = smartNormalize(rawData);
    }

    return c.json({
      success: true,
      normalized,
      brand: normalized.device_brand,
      quality: normalized.data_quality,
    });
  } catch (error: any) {
    console.error('[NORMALIZE] Error:', error);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================
// ROUTE : CONVERSION FHIR
// ============================================

app.post('/convert-to-fhir', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { patient, telemetry, device, type } = body;

    if (!type) {
      return c.json({ error: 'Missing type (patient, telemetry, device, bundle)' }, 400);
    }

    let fhirResource;

    switch (type) {
      case 'patient':
        if (!patient) return c.json({ error: 'Missing patient data' }, 400);
        fhirResource = patientToFHIR(patient);
        break;

      case 'telemetry':
        if (!telemetry) return c.json({ error: 'Missing telemetry data' }, 400);
        fhirResource = telemetryToFHIR(telemetry, patient?.id);
        break;

      case 'device':
        if (!device) return c.json({ error: 'Missing device data' }, 400);
        fhirResource = deviceToFHIR(device);
        break;

      case 'bundle':
        if (!patient || !telemetry || !device) {
          return c.json({ error: 'Missing data for bundle' }, 400);
        }
        fhirResource = createFHIRBundle(patient, telemetry, device);
        break;

      default:
        return c.json({ error: 'Invalid type' }, 400);
    }

    return c.json({
      success: true,
      fhir: fhirResource,
      standard: 'HL7 FHIR R4',
    });
  } catch (error: any) {
    console.error('[FHIR] Error:', error);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================
// ROUTE : GÉNÉRATION DE RAPPORT PDF
// ============================================

app.post('/generate-report', requireAuth, async (c) => {
  try {
    const reportData: ReportData = await c.req.json();

    if (!reportData.patient || !reportData.telemetry) {
      return c.json({ error: 'Missing patient or telemetry data' }, 400);
    }

    console.log('[GENERATE REPORT] Creating PDF for patient:', reportData.patient.id);

    // Générer HTML
    const html = generateReportHTML(reportData);

    // Convertir en PDF
    const pdfBytes = await convertHTMLToPDF(html);

    // Sauvegarder dans Supabase Storage
    const fileName = `report_${reportData.patient.id}_${Date.now()}.pdf`;
    const filePath = `reports/${fileName}`;

    // Vérifier si le bucket existe, sinon le créer
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'reports');

    if (!bucketExists) {
      console.log('[GENERATE REPORT] Creating reports bucket...');
      await supabase.storage.createBucket('reports', {
        public: false,
      });
    }

    // Upload du PDF
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[GENERATE REPORT] Upload error:', uploadError);
      return c.json({ error: 'Failed to upload PDF' }, 500);
    }

    // Générer une URL signée (valide 1 an)
    const { data: signedUrlData } = await supabase.storage
      .from('reports')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60);

    console.log('[GENERATE REPORT] ✅ PDF generated and saved');

    return c.json({
      success: true,
      file_path: filePath,
      file_name: fileName,
      signed_url: signedUrlData?.signedUrl,
      html_preview: html.substring(0, 500) + '...',
    });
  } catch (error: any) {
    console.error('[GENERATE REPORT] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// ROUTE : ANALYSE & CRÉATION DE TÂCHES AUTOMATIQUES
// ============================================

app.post('/analyze-and-create-tasks', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { patientId, patientName, currentData, recentHistory } = body;

    if (!patientId || !patientName || !currentData) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log('[TASK ENGINE] Analyzing patient:', patientName);

    // Calculer le score quotidien
    const scoreResult = calculateDailyScore(currentData);

    // Analyser et créer les tâches
    const triggers = createAutomaticTask(
      patientId,
      patientName,
      currentData,
      recentHistory || []
    );

    // Sauvegarder les tâches en DB
    const savedTasks: Task[] = [];
    for (const trigger of triggers) {
      if (trigger.task) {
        await saveTaskToDatabase(trigger.task, supabase);
        savedTasks.push(trigger.task);
      }
    }

    return c.json({
      success: true,
      score: scoreResult.score,
      score_details: scoreResult.details,
      triggers_count: triggers.length,
      tasks_created: savedTasks,
    });
  } catch (error: any) {
    console.error('[TASK ENGINE] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// ROUTE : RÉCUPÉRER LES TÂCHES D'UN PATIENT
// ============================================

app.get('/tasks/:patientId', requireAuth, async (c) => {
  try {
    const patientId = c.req.param('patientId');

    const { data, error } = await supabase
      .from('kv_store_50732e52')
      .select('*')
      .like('key', `task:${patientId}:%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET TASKS] Error:', error);
      return c.json({ error: 'Failed to fetch tasks' }, 500);
    }

    const tasks = data.map(row => JSON.parse(row.value));

    return c.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error: any) {
    console.error('[GET TASKS] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
