/**
 * Dashboards & user management routes.
 * Mounted at the root prefix (paths span /patient, /doctor, /admin),
 * so middlewares are attached PER ROUTE — no app.use('*') here.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth.ts';
import doctorPortalRoutes from './doctor-portal.ts';

const app = new Hono<AuthEnv>();

// ============================================
// PATIENT ROUTES
// ============================================

app.get('/patient/dashboard', requireAuth, requireRole('patient'), async (c) => {
  try {
    const user = c.get('user');

    // Get patient data with related information (RLS filters automatically)
    let { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select(`
        *,
        users!patients_user_id_fkey(id, email, name, role, phone, address)
      `)
      .eq('user_id', user.id)
      .single();

    // If patient data doesn't exist, create it automatically (auto-initialization)
    if (patientError || !patientData) {
      console.log('[PATIENT DASHBOARD] Patient data not found, creating automatically...');

      // First ensure user record exists in Postgres
      const { error: userUpsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Patient',
          role: 'patient',
        }, { onConflict: 'id' });

      if (userUpsertError) {
        console.error('[PATIENT DASHBOARD] Error creating user record:', userUpsertError);
      }

      // Create patient record
      const { error: createPatientError } = await supabase
        .from('patients')
        .insert({
          user_id: user.id,
          diagnosis_date: new Date().toISOString().split('T')[0],
          device_installed: true,
          treatment_start_date: new Date().toISOString().split('T')[0],
        });

      if (createPatientError) {
        console.error('[PATIENT DASHBOARD] Error creating patient record:', createPatientError);
        return c.json({
          error: 'Patient data not found and auto-creation failed',
          details: createPatientError.message,
          suggestion: 'Contactez votre prestataire pour initialiser votre dossier patient'
        }, 404);
      }

      // PAS de génération de données d'observance fictives : les données
      // viennent exclusivement du télésuivi réel (universal-adapter / moteur).
      // Un nouveau patient sans données voit un état vide honnête.

      // Fetch the newly created patient data
      const { data: fetchedPatientData, error: fetchError } = await supabase
        .from('patients')
        .select(`
          *,
          users!patients_user_id_fkey(id, email, name, role, phone, address)
        `)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !fetchedPatientData) {
        console.error('[PATIENT DASHBOARD] Error fetching newly created patient:', fetchError);
        return c.json({ error: 'Failed to fetch patient data after creation' }, 500);
      }

      patientData = fetchedPatientData;
      console.log('[PATIENT DASHBOARD] Patient data created successfully');
    }

    // Separately fetch doctor data if assigned (to handle nullable assigned_doctor_id)
    let doctorData = null;
    if (patientData.assigned_doctor_id) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select(`
          user_id,
          specialty,
          license_number,
          panel_code,
          users!doctors_user_id_fkey(name, email, phone)
        `)
        .eq('user_id', patientData.assigned_doctor_id)
        .single();

      doctorData = doctor;
    }

    // Get observance data (RLS filters automatically)
    const { data: observanceData, error: observanceError } = await supabase
      .from('observance_data')
      .select('*')
      .eq('patient_id', patientData.id)
      .order('date', { ascending: false })
      .limit(30);

    if (observanceError) {
      console.error('[PATIENT DASHBOARD] Error fetching observance data:', observanceError);
    }

    return c.json({
      user: patientData.users,
      patientData: {
        id: patientData.id,
        panel_code: patientData.panel_code, // V3: Nouveau
        diagnosis_date: patientData.diagnosis_date,
        device_installed: patientData.device_installed,
        treatment_start_date: patientData.treatment_start_date,
        birth_date: patientData.birth_date,
        notes: patientData.notes,
        assigned_doctor: doctorData,
      },
      observance_data: observanceData || [],
    });
  } catch (error: any) {
    console.error('[PATIENT DASHBOARD] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// DOCTOR ROUTES
// ============================================

app.get('/doctor/dashboard', requireAuth, requireRole('doctor'), async (c) => {
  try {
    const user = c.get('user');

    // Get doctor profile with panel_code
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (doctorError) {
      console.error('[DOCTOR DASHBOARD] Error fetching doctor data:', doctorError);
      return c.json({ error: 'Doctor data not found', details: doctorError.message }, 404);
    }

    // Get ONLY patients assigned to this doctor (RLS filters automatically)
    // V3: panel_code est maintenant disponible
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select(`
        *,
        users!patients_user_id_fkey(id, email, name, phone, address)
      `)
      .eq('assigned_doctor_id', user.id);

    if (patientsError) {
      console.error('[DOCTOR DASHBOARD] Error fetching patients:', patientsError);
      return c.json({ error: 'Failed to fetch patients', details: patientsError.message }, 500);
    }

    // Get observance data for each patient
    const patientsWithObservance = [];
    for (const patient of patients || []) {
      const { data: observanceData } = await supabase
        .from('observance_data')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date', { ascending: false })
        .limit(30);

      patientsWithObservance.push({
        ...patient.users,
        patientData: {
          id: patient.id,
          panel_code: patient.panel_code, // V3: Nouveau
          diagnosis_date: patient.diagnosis_date,
          device_installed: patient.device_installed,
          treatment_start_date: patient.treatment_start_date,
          observance_data: observanceData || [],
        },
      });
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        role: 'doctor',
      },
      doctorData: {
        ...doctorData,
        panel_code: doctorData.panel_code, // V3: Nouveau
      },
      patients: patientsWithObservance,
      stats: {
        total_patients: patients?.length || 0,
        panel_code: doctorData.panel_code, // V3: Pour affichage dans UI
      },
    });
  } catch (error: any) {
    console.error('[DOCTOR DASHBOARD] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// NOTE: semantics preserved from the original inline handler — only ADMINS
// can assign patients in V3, even though the URL lives under /doctor/*.
app.post('/doctor/assign-patient', requireAuth, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { patient_user_id, doctor_user_id } = body;

    if (!patient_user_id || !doctor_user_id) {
      return c.json({ error: 'patient_user_id and doctor_user_id are required' }, 400);
    }

    // Update patient assignment
    // V3: Le trigger sync_patient_panel_code() va automatiquement copier le panel_code du médecin
    const { error: updateError } = await supabase
      .from('patients')
      .update({ assigned_doctor_id: doctor_user_id })
      .eq('user_id', patient_user_id);

    if (updateError) {
      console.error('[ASSIGN PATIENT] Error:', updateError);
      return c.json({ error: 'Failed to assign patient', details: updateError.message }, 500);
    }

    console.log(`[ASSIGN PATIENT] Patient ${patient_user_id} assigned to doctor ${doctor_user_id}`);
    console.log(`[ASSIGN PATIENT] Trigger sync_patient_panel_code() should have copied panel_code automatically`);

    return c.json({
      success: true,
      message: 'Patient assigned successfully (panel_code copied automatically by trigger)'
    });
  } catch (error: any) {
    console.error('[ASSIGN PATIENT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/admin/users', requireAuth, requireRole('admin'), async (c) => {
  try {
    // Get all users from Postgres (RLS allows admin to see all)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        patients!patients_user_id_fkey(*),
        doctors!doctors_user_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('[ADMIN USERS] Error fetching users:', usersError);
      return c.json({ error: 'Failed to fetch users', details: usersError.message }, 500);
    }

    // Get observance data for patients
    const usersWithData = [];
    for (const user of allUsers || []) {
      const userData: any = { ...user };

      if (user.patients && user.patients.length > 0) {
        const { data: observanceData } = await supabase
          .from('observance_data')
          .select('*')
          .eq('patient_id', user.patients[0].id)
          .order('date', { ascending: false })
          .limit(30);

        userData.patients[0].observance_data = observanceData || [];

        // V3: Ajouter info sur le médecin assigné si panel_code existe
        if (user.patients[0].assigned_doctor_id) {
          const { data: assignedDoctor } = await supabase
            .from('doctors')
            .select('panel_code, specialty, users!doctors_user_id_fkey(name, email)')
            .eq('user_id', user.patients[0].assigned_doctor_id)
            .single();

          userData.patients[0].assigned_doctor = assignedDoctor;
        }
      }

      usersWithData.push(userData);
    }

    // V3: Statistiques par panel_code
    const { data: doctorStats } = await supabase
      .from('doctors')
      .select('panel_code, user_id');

    const panelStats: any = {};
    if (doctorStats) {
      for (const doc of doctorStats) {
        if (doc.panel_code) {
          const { count } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('panel_code', doc.panel_code);

          panelStats[doc.panel_code] = count || 0;
        }
      }
    }

    return c.json({
      users: usersWithData,
      stats: {
        total_users: usersWithData.length,
        total_patients: usersWithData.filter(u => u.role === 'patient').length,
        total_doctors: usersWithData.filter(u => u.role === 'doctor').length,
        total_admins: usersWithData.filter(u => u.role === 'admin').length,
        panel_codes: panelStats, // V3: Nouveau
      },
    });
  } catch (error: any) {
    console.error('[ADMIN USERS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// V3: Nouvelle route pour changer le panel_code d'un médecin
app.post('/admin/update-doctor-panel-code', requireAuth, requireRole('admin'), async (c) => {
  try {
    const body = await c.req.json();
    const { doctor_user_id, new_panel_code } = body;

    if (!doctor_user_id || !new_panel_code) {
      return c.json({ error: 'doctor_user_id and new_panel_code are required' }, 400);
    }

    // Update doctor panel_code
    // V3: Le trigger update_doctor_panel_code() va automatiquement propager vers tous les patients
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ panel_code: new_panel_code })
      .eq('user_id', doctor_user_id);

    if (updateError) {
      console.error('[UPDATE PANEL CODE] Error:', updateError);
      return c.json({ error: 'Failed to update panel code', details: updateError.message }, 500);
    }

    console.log(`[UPDATE PANEL CODE] Doctor ${doctor_user_id} panel_code updated to ${new_panel_code}`);
    console.log(`[UPDATE PANEL CODE] Trigger propagate_panel_code() should have updated all patients automatically`);

    return c.json({
      success: true,
      message: 'Panel code updated successfully (propagated to all patients automatically by trigger)'
    });
  } catch (error: any) {
    console.error('[UPDATE PANEL CODE] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// PORTAIL MÉDECIN (chantier portail prescripteur)
// /doctor/cohort, /doctor/patients/:id, /doctor/notes*, /doctor/alerts
// Monté ici pour ne pas toucher index.tsx ; les routes /doctor/dashboard
// et /doctor/assign-patient ci-dessus sont enregistrées AVANT et gardent
// leurs propres middlewares.
// ============================================

app.route('/', doctorPortalRoutes);

export default app;
