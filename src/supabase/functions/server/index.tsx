import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { setupPrestataireTablesRoute } from './setup.tsx';
import { autoSetupTables } from './auto-setup.tsx';

// Import Alert & Gamification Engines
import { analyzePatient, analyzeBatch } from './alert-engine.ts';
import { updatePatientGamification, processNewNight } from './gamification-engine.ts';

// Import Audit Middleware
import { auditMiddleware } from './audit-middleware.ts';

// NOUVEAU : Import IoT Engines
import { parseUniversalData, saveSleepData, detectFileFormat } from './universal-adapter.ts';
import { calculateExpAirScore, saveExpAirScore, getScoreHistory } from './scoring-engine.ts';
import { analyzeAndCreateAlerts, acknowledgeAlert, resolveAlert } from './smart-alerts-engine.ts';

// Import IoT Routes
import { registerIotRoutes } from './iot-routes.ts';

// PHASE 3: Import Business Routes
import businessRoutes from './business-routes.ts';

// PHASE 3: Import PSC Auth Routes
import pscRoutes from './psc-auth.ts';

// PHASE 3: Import Billing Automation Routes
import { billingAutomation } from './billing-automation.ts';

// PHASE 5: Import Automation Routes
import automationRoutes from './automation-routes.ts';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// NOUVEAU : Middleware Audit Logs (avant toutes les routes)
app.use('*', auditMiddleware());

// Initialize Supabase client with SERVICE_ROLE_KEY for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Routes prefix
const prefix = '/make-server-50732e52';

// ============================================
// HEALTH & DIAGNOSTIC ROUTES
// ============================================

app.get(`${prefix}/health`, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get(`${prefix}/diagnose-user`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Invalid token', details: error?.message }, 401);
    }

    // Get user from Postgres
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get role-specific data
    let roleData = null;
    if (userData?.role === 'patient') {
      const { data } = await supabase
        .from('patients')
        .select('*, doctors:assigned_doctor_id(*)')
        .eq('user_id', user.id)
        .single();
      roleData = data;
    } else if (userData?.role === 'doctor') {
      const { data } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      roleData = data;
    }

    return c.json({
      user_id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      postgres_user: userData,
      role_data: roleData,
      role_in_metadata: user.user_metadata?.role,
      role_in_postgres: userData?.role,
      roles_match: user.user_metadata?.role === userData?.role,
      diagnosis: {
        has_role_in_metadata: !!user.user_metadata?.role,
        has_role_in_postgres: !!userData?.role,
        role_value: user.user_metadata?.role || 'NOT SET',
        is_patient: user.user_metadata?.role === 'patient',
        is_doctor: user.user_metadata?.role === 'doctor',
        is_admin: user.user_metadata?.role === 'admin',
        triggers_active: userData ? 'YES - triggers created user/patient/doctor automatically' : 'NO',
      },
      recommendation: !user.user_metadata?.role 
        ? 'Le rôle n\'est pas défini. Visitez /init-demo-accounts pour créer les comptes démo.' 
        : 'Le rôle est correctement défini.',
    });
  } catch (error: any) {
    console.error('[DIAGNOSE USER] Error:', error);
    return c.json({ error: 'Diagnostic failed', details: error.message }, 500);
  }
});

// ============================================
// DEMO ACCOUNTS INITIALIZATION (V3 - Avec Triggers)
// ============================================

app.post(`${prefix}/init-demo-accounts`, async (c) => {
  try {
    console.log('[INIT DEMO V3] Starting demo accounts initialization with triggers...');
    
    // V3: Les triggers s'occupent de créer users/patients/doctors automatiquement
    // On a juste besoin de créer dans auth.users avec les bonnes metadata
    const demoAccounts = [
      {
        email: 'testpatient@demo.fr',
        password: 'Test-123',
        metadata: {
          name: 'Patient Démonstration',
          role: 'patient',
        },
      },
      {
        email: 'testmedecin@demo.fr',
        password: 'Test-123',
        metadata: {
          name: 'Dr. Démonstration',
          role: 'doctor',
          specialty: 'Pneumologie',
          license_number: 'DEMO12345678',
          panel_code: 'DEMO345',
        },
      },
      {
        email: 'admin@demo.fr',
        password: 'Test-123',
        metadata: {
          name: 'Admin Démonstration',
          role: 'admin',
        },
      },
    ];

    const results = [];

    for (const account of demoAccounts) {
      try {
        // Check if user already exists in auth.users
        const { data: existingAuthUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error('[INIT DEMO V3] Error listing users:', listError);
          results.push({ email: account.email, status: 'error', error: listError.message });
          continue;
        }

        const existingAuthUser = existingAuthUsers.users?.find(u => u.email === account.email);
        
        if (existingAuthUser) {
          console.log(`[INIT DEMO V3] User ${account.email} already exists, updating metadata...`);
          
          // Update user_metadata to ensure everything is in sync
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingAuthUser.id,
            { user_metadata: account.metadata }
          );
          
          if (updateError) {
            console.error(`[INIT DEMO V3] Error updating metadata for ${account.email}:`, updateError);
            results.push({ email: account.email, status: 'metadata_update_failed', error: updateError.message });
            continue;
          }

          // Manually sync to Postgres (triggers only fire on INSERT, not UPDATE)
          const { error: upsertUserError } = await supabase
            .from('users')
            .upsert({
              id: existingAuthUser.id,
              email: account.email,
              name: account.metadata.name,
              role: account.metadata.role,
            }, { onConflict: 'id' });

          if (upsertUserError) {
            console.error(`[INIT DEMO V3] Error upserting user ${account.email}:`, upsertUserError);
          }

          // Upsert role-specific data
          if (account.metadata.role === 'patient') {
            // Upsert patient
            const { error: patientError } = await supabase
              .from('patients')
              .upsert({
                user_id: existingAuthUser.id,
                diagnosis_date: '2024-01-15',
                device_installed: true,
                treatment_start_date: '2024-02-01',
              }, { onConflict: 'user_id' });

            if (patientError) {
              console.error(`[INIT DEMO V3] Error upserting patient:`, patientError);
            }

            // Add sample observance data
            const { data: patientData } = await supabase
              .from('patients')
              .select('id')
              .eq('user_id', existingAuthUser.id)
              .single();

            if (patientData) {
              // Generate 30 days of sample data
              const today = new Date();
              const sampleDates = [];
              for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                sampleDates.push(date.toISOString().split('T')[0]);
              }
              
              for (const date of sampleDates) {
                await supabase
                  .from('observance_data')
                  .upsert({
                    patient_id: patientData.id,
                    date: date,
                    hours_used: 6.5 + Math.random() * 1.5,
                    leakage: Math.floor(Math.random() * 10) + 3,
                    events: Math.floor(Math.random() * 5) + 1,
                  }, { onConflict: 'patient_id,date' });
              }
            }

          } else if (account.metadata.role === 'doctor') {
            // Upsert doctor with panel_code
            const { error: doctorError } = await supabase
              .from('doctors')
              .upsert({
                user_id: existingAuthUser.id,
                specialty: account.metadata.specialty || 'Pneumologie',
                license_number: account.metadata.license_number || 'DEMO12345678',
                panel_code: account.metadata.panel_code || null,
              }, { onConflict: 'user_id' });

            if (doctorError) {
              console.error(`[INIT DEMO V3] Error upserting doctor:`, doctorError);
            }
          }

          console.log(`[INIT DEMO V3] ✅ Updated ${account.email}`);
          results.push({ email: account.email, status: 'updated', id: existingAuthUser.id });
          continue;
        }

        // Create new user - triggers will handle users/patients/doctors creation automatically
        console.log(`[INIT DEMO V3] Creating new user ${account.email}...`);
        
        // Try to create user - if trigger fails due to schema mismatch, we'll handle manually
        let userId: string;
        let userCreated = false;
        
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            user_metadata: account.metadata,
            email_confirm: true,
          });

          if (authError) {
            // If it's a database error, the user might have been created but trigger failed
            if (authError.message?.includes('Database error')) {
              console.warn(`[INIT DEMO V3] Database error creating ${account.email}, checking if user was created...`);
              
              // Check if auth user was created despite error
              const { data: checkUsers } = await supabase.auth.admin.listUsers();
              const createdUser = checkUsers.users?.find(u => u.email === account.email);
              
              if (createdUser) {
                console.log(`[INIT DEMO V3] Auth user was created despite error, ID: ${createdUser.id}`);
                userId = createdUser.id;
                userCreated = true;
              } else {
                throw authError;
              }
            } else {
              throw authError;
            }
          } else {
            userId = authData.user.id;
            userCreated = true;
            console.log(`[INIT DEMO V3] Created auth user ${account.email} with ID: ${userId}`);
          }
        } catch (error: any) {
          console.error(`[INIT DEMO V3] Error creating auth user ${account.email}:`, error);
          results.push({ email: account.email, status: 'auth_creation_failed', error: error.message });
          continue;
        }

        if (!userCreated) {
          console.error(`[INIT DEMO V3] Failed to create user ${account.email}`);
          results.push({ email: account.email, status: 'auth_creation_failed' });
          continue;
        }

        console.log(`[INIT DEMO V3] Checking/creating database records for ${account.email}...`);
        
        // Wait a bit for triggers to execute
        await new Promise(resolve => setTimeout(resolve, 500));

        // Manually ensure user record exists (in case trigger failed)
        const { error: upsertUserError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: account.email,
            name: account.metadata.name,
            role: account.metadata.role,
          }, { onConflict: 'id' });

        if (upsertUserError) {
          console.error(`[INIT DEMO V3] Error upserting user ${account.email}:`, upsertUserError);
        }

        // Manually ensure role-specific records exist
        if (account.metadata.role === 'patient') {
          const { error: patientError } = await supabase
            .from('patients')
            .upsert({
              user_id: userId,
              diagnosis_date: '2024-01-15',
              device_installed: true,
              treatment_start_date: '2024-02-01',
            }, { onConflict: 'user_id' });

          if (patientError) {
            console.error(`[INIT DEMO V3] Error upserting patient:`, patientError);
          }

          // Add sample observance data
          const { data: patientData } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (patientData) {
            // Generate 30 days of sample data
            const today = new Date();
            const sampleDates = [];
            for (let i = 29; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(date.getDate() - i);
              sampleDates.push(date.toISOString().split('T')[0]);
            }
            
            for (const date of sampleDates) {
              await supabase
                .from('observance_data')
                .upsert({
                  patient_id: patientData.id,
                  date: date,
                  hours_used: 6.5 + Math.random() * 1.5,
                  leakage: Math.floor(Math.random() * 10) + 3,
                  events: Math.floor(Math.random() * 5) + 1,
                }, { onConflict: 'patient_id,date' });
            }
          }
        } else if (account.metadata.role === 'doctor') {
          const { error: doctorError } = await supabase
            .from('doctors')
            .upsert({
              user_id: userId,
              specialty: account.metadata.specialty || 'Pneumologie',
              license_number: account.metadata.license_number || 'DEMO12345678',
              panel_code: account.metadata.panel_code || null,
            }, { onConflict: 'user_id' });

          if (doctorError) {
            console.error(`[INIT DEMO V3] Error upserting doctor:`, doctorError);
          }
        }

        console.log(`[INIT DEMO V3] ✅ Created ${account.email}`);
        results.push({ email: account.email, status: 'created', id: userId });

      } catch (error: any) {
        console.error(`[INIT DEMO V3] Error initializing ${account.email}:`, error);
        results.push({ email: account.email, status: 'error', error: error.message });
      }
    }
    
    return c.json({ 
      success: true, 
      message: 'Demo accounts initialization complete (V3 with triggers)',
      results 
    });
  } catch (error: any) {
    console.error('[INIT DEMO V3] Fatal error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// PATIENT ROUTES
// ============================================

app.get(`${prefix}/patient/dashboard`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if user is a patient
    const userRole = user.user_metadata?.role;
    if (userRole !== 'patient') {
      return c.json({ error: 'Forbidden - Not a patient account' }, 403);
    }

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
          suggestion: 'Please visit /init-demo to initialize demo accounts'
        }, 404);
      }

      // Generate 30 days of sample observance data
      const { data: newPatientData } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (newPatientData) {
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          await supabase
            .from('observance_data')
            .insert({
              patient_id: newPatientData.id,
              date: date.toISOString().split('T')[0],
              hours_used: 6.5 + Math.random() * 1.5,
              leakage: Math.floor(Math.random() * 10) + 3,
              events: Math.floor(Math.random() * 5) + 1,
            });
        }
      }

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

app.get(`${prefix}/doctor/dashboard`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if user is a doctor
    const userRole = user.user_metadata?.role;
    console.log(`[DOCTOR DASHBOARD] User ${user.email} attempting to access. Role: ${userRole}`);
    
    if (userRole !== 'doctor') {
      console.log(`[DOCTOR DASHBOARD] Access denied. Expected 'doctor', got '${userRole}'`);
      return c.json({ 
        error: 'Forbidden - Not a doctor account',
        details: `Your account role is '${userRole}' but this endpoint requires 'doctor'.`
      }, 403);
    }

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

app.post(`${prefix}/doctor/assign-patient`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if user is admin (only admin can assign patients in V3)
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden - Only admins can assign patients' }, 403);
    }

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

app.get(`${prefix}/admin/users`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden - Not an admin account' }, 403);
    }

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
app.post(`${prefix}/admin/update-doctor-panel-code`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden - Only admins can update panel codes' }, 403);
    }

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
// SETUP ROUTE (CREATE TABLES AUTOMATICALLY)
// ============================================

app.post(`${prefix}/setup/create-prestataire-tables`, setupPrestataireTablesRoute);

// Force reset and recreate tables (for fixing schema issues)
app.post(`${prefix}/setup/reset-and-recreate-tables`, async (c) => {
  try {
    console.log('[RESET TABLES] Forcing complete table recreation...');
    
    // Use the force-recreate function to bypass all caching
    const { forceRecreateTables } = await import('./force-recreate.tsx');
    const result = await forceRecreateTables();
    
    if (result.success) {
      // Reset the auto-setup state so it knows tables are now correct
      const { resetSetupState } = await import('./auto-setup.tsx');
      resetSetupState();
    }
    
    return c.json(result);
  } catch (error: any) {
    console.error('[RESET TABLES] Error:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      details: error.stack 
    }, 500);
  }
});

// ============================================
// PRESTATAIRE ROUTES (ALERTES & INTERVENTIONS)
// ============================================

// Helper function to verify prestataire access
const verifyPrestataire = async (accessToken: string) => {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const userRole = user.user_metadata?.role;
  if (userRole !== 'admin' && userRole !== 'prestataire') {
    return { error: 'Forbidden - Prestataire access required', status: 403 };
  }

  return { user };
};

// Helper function to log actions
const logAction = async (userId: string, action: string, details: any = {}) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
      ip_address: 'unknown', // TODO: Get from request
      user_agent: 'unknown', // TODO: Get from request
    });
  } catch (error) {
    console.error('[AUDIT LOG] Error:', error);
  }
};

// GET /prestataire/alerts - Get all active alerts
app.get(`${prefix}/prestataire/alerts`, async (c) => {
  try {
    // Auto-setup: Create tables if they don't exist
    const setupResult = await autoSetupTables();
    if (!setupResult.success && setupResult.error) {
      console.warn('[PRESTATAIRE ALERTS] Auto-setup warning:', setupResult.error);
    }
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    // Get all active alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        *,
        patient:patients!alerts_patient_id_fkey(
          id,
          user:users!patients_user_id_fkey(name, phone, email)
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PRESTATAIRE ALERTS] Error fetching alerts:', error);
      return c.json({ error: 'Failed to fetch alerts', details: error.message }, 500);
    }

    // Log access
    await logAction(authResult.user!.id, 'view_alerts', { count: alerts?.length || 0 });

    return c.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('[PRESTATAIRE ALERTS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /prestataire/alerts/:id/resolve - Resolve an alert
app.post(`${prefix}/prestataire/alerts/:id/resolve`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const alertId = c.req.param('id');
    const body = await c.req.json();
    const { method, notes } = body;

    if (!method || !notes) {
      return c.json({ error: 'method and notes are required' }, 400);
    }

    // Get alert details first
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Update alert status
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: authResult.user!.id,
        resolution_method: method,
        resolution_notes: notes,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[RESOLVE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to resolve alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'resolve_alert', {
      alert_id: alertId,
      patient_id: alert.patient_id,
      method,
    });

    return c.json({ success: true, message: 'Alert resolved successfully' });
  } catch (error: any) {
    console.error('[RESOLVE ALERT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /prestataire/alerts/:id/ignore - Ignore an alert
app.post(`${prefix}/prestataire/alerts/:id/ignore`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const alertId = c.req.param('id');

    // Get alert details first
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Update alert status to ignored
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: authResult.user!.id,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[IGNORE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to ignore alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'ignore_alert', {
      alert_id: alertId,
      patient_id: alert.patient_id,
    });

    return c.json({ success: true, message: 'Alert ignored successfully' });
  } catch (error: any) {
    console.error('[IGNORE ALERT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /prestataire/interventions - Get all interventions with optional filter
app.get(`${prefix}/prestataire/interventions`, async (c) => {
  try {
    // Auto-setup: Create tables if they don't exist
    const setupResult = await autoSetupTables();
    if (!setupResult.success && setupResult.error) {
      console.warn('[PRESTATAIRE INTERVENTIONS] Auto-setup warning:', setupResult.error);
    }
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const statusFilter = c.req.query('status'); // all, scheduled, in_progress, completed

    let query = supabase
      .from('interventions')
      .select(`
        *,
        patient:patients!interventions_patient_id_fkey(
          id,
          user:users!patients_user_id_fkey(name, phone, email)
        )
      `)
      .order('date', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: interventions, error } = await query;

    if (error) {
      console.error('[PRESTATAIRE INTERVENTIONS] Error fetching interventions:', error);
      return c.json({ error: 'Failed to fetch interventions', details: error.message }, 500);
    }

    // Log access
    await logAction(authResult.user!.id, 'view_interventions', { 
      count: interventions?.length || 0,
      filter: statusFilter || 'all'
    });

    return c.json({ interventions: interventions || [] });
  } catch (error: any) {
    console.error('[PRESTATAIRE INTERVENTIONS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /prestataire/interventions - Create a new intervention
app.post(`${prefix}/prestataire/interventions`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const body = await c.req.json();
    const { patient_id, technician_id, type, date, notes, material, alert_id } = body;

    if (!patient_id || !type || !date) {
      return c.json({ error: 'patient_id, type, and date are required' }, 400);
    }

    // Create intervention
    const { data: intervention, error: createError } = await supabase
      .from('interventions')
      .insert({
        patient_id,
        technician_id: technician_id || authResult.user!.id,
        type,
        date,
        notes,
        material,
        status: 'scheduled',
        created_by: authResult.user!.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[CREATE INTERVENTION] Error:', createError);
      return c.json({ error: 'Failed to create intervention', details: createError.message }, 500);
    }

    // If created from alert, resolve the alert automatically
    if (alert_id) {
      await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: authResult.user!.id,
          resolution_method: 'intervention_created',
          resolution_notes: `Intervention ${intervention.id} created`,
        })
        .eq('id', alert_id);
    }

    // Log action
    await logAction(authResult.user!.id, 'create_intervention', {
      intervention_id: intervention.id,
      patient_id,
      type,
      from_alert: !!alert_id,
    });

    return c.json({ success: true, intervention });
  } catch (error: any) {
    console.error('[CREATE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PATCH /prestataire/interventions/:id/start - Start an intervention
app.patch(`${prefix}/prestataire/interventions/:id/start`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const interventionId = c.req.param('id');

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', interventionId);

    if (updateError) {
      console.error('[START INTERVENTION] Error:', updateError);
      return c.json({ error: 'Failed to start intervention', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'start_intervention', {
      intervention_id: interventionId,
    });

    return c.json({ success: true, message: 'Intervention started successfully' });
  } catch (error: any) {
    console.error('[START INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PATCH /prestataire/interventions/:id/complete - Complete an intervention
app.patch(`${prefix}/prestataire/interventions/:id/complete`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const interventionId = c.req.param('id');
    const body = await c.req.json();
    const { duration, materialUsed, notes, patientSatisfaction, followUpNeeded, followUpNotes } = body;

    // Get intervention details
    const { data: intervention } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single();

    if (!intervention) {
      return c.json({ error: 'Intervention not found' }, 404);
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        duration,
        material_used: materialUsed,
        patient_satisfaction: patientSatisfaction,
      })
      .eq('id', interventionId);

    if (updateError) {
      console.error('[COMPLETE INTERVENTION] Error:', updateError);
      return c.json({ error: 'Failed to complete intervention', details: updateError.message }, 500);
    }

    // If follow-up needed, create a new alert
    if (followUpNeeded) {
      await supabase.from('alerts').insert({
        patient_id: intervention.patient_id,
        type: 'follow_up',
        severity: 'low',
        message: 'Suivi nécessaire après intervention',
        details: followUpNotes || 'Intervention completed, follow-up required',
        status: 'active',
      });
    }

    // Log action
    await logAction(authResult.user!.id, 'complete_intervention', {
      intervention_id: interventionId,
      patient_id: intervention.patient_id,
      follow_up_needed: followUpNeeded,
      satisfaction: patientSatisfaction,
    });

    return c.json({ success: true, message: 'Intervention completed successfully' });
  } catch (error: any) {
    console.error('[COMPLETE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /prestataire/dashboard/stats - Get dashboard statistics
app.get(`${prefix}/prestataire/dashboard/stats`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    // Get alerts stats
    const { data: alerts } = await supabase
      .from('alerts')
      .select('severity')
      .eq('status', 'active');

    const alertsStats = {
      total: alerts?.length || 0,
      high: alerts?.filter(a => a.severity === 'high').length || 0,
      medium: alerts?.filter(a => a.severity === 'medium').length || 0,
      low: alerts?.filter(a => a.severity === 'low').length || 0,
    };

    // Get interventions stats
    const { data: interventions } = await supabase
      .from('interventions')
      .select('status');

    const interventionsStats = {
      total: interventions?.length || 0,
      scheduled: interventions?.filter(i => i.status === 'scheduled').length || 0,
      in_progress: interventions?.filter(i => i.status === 'in_progress').length || 0,
      completed: interventions?.filter(i => i.status === 'completed').length || 0,
    };

    // Get patients count
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    return c.json({
      alerts: alertsStats,
      interventions: interventionsStats,
      patients: {
        total: patientsCount || 0,
      },
    });
  } catch (error: any) {
    console.error('[PRESTATAIRE STATS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// ALERT ENGINE ROUTES
// ============================================

app.post(`${prefix}/alerts/analyze/:patientId`, async (c) => {
  try {
    const patientId = c.req.param('patientId');
    
    if (!patientId) {
      return c.json({ error: 'Patient ID required' }, 400);
    }

    console.log(`[ALERT ENGINE API] Analyzing patient ${patientId}`);
    const result = await analyzePatient(patientId);

    return c.json({
      success: result.success,
      patientId,
      alertsCreated: result.alertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ALERT ENGINE API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post(`${prefix}/alerts/analyze-batch`, async (c) => {
  try {
    console.log('[ALERT ENGINE API] Starting batch analysis');
    const result = await analyzeBatch();

    return c.json({
      success: result.success,
      patientsAnalyzed: result.patientsAnalyzed,
      totalAlerts: result.totalAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ALERT ENGINE API] Batch error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// ALERTS MANAGEMENT ROUTES (bypasses RLS)
// ============================================

// Get alerts for a patient
app.get(`${prefix}/alerts/patient/:patientId`, async (c) => {
  try {
    const patientId = c.req.param('patientId');
    
    if (!patientId) {
      return c.json({ error: 'Patient ID required' }, 400);
    }

    console.log(`[ALERTS API] Fetching alerts for patient ${patientId}`);
    
    // Use service role to bypass RLS
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[ALERTS API] Error fetching alerts:', error);
      
      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        return c.json({ alerts: [], unreadCount: 0 });
      }
      
      return c.json({ error: error.message }, 500);
    }

    return c.json({ 
      alerts: alerts || [],
      unreadCount: alerts?.length || 0
    });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Acknowledge an alert (mark as ignored in our schema)
app.patch(`${prefix}/alerts/:alertId/acknowledge`, async (c) => {
  try {
    const alertId = c.req.param('alertId');
    const body = await c.req.json();
    const { userId } = body;
    
    if (!alertId) {
      return c.json({ error: 'Alert ID required' }, 400);
    }

    console.log(`[ALERTS API] Acknowledging alert ${alertId}`);
    
    // In our schema, "acknowledge" means mark as ignored
    // Use service role to bypass RLS
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: userId || null,
      })
      .eq('id', alertId);

    if (error) {
      console.error('[ALERTS API] Error acknowledging alert:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Resolve an alert
app.patch(`${prefix}/alerts/:alertId/resolve`, async (c) => {
  try {
    const alertId = c.req.param('alertId');
    
    if (!alertId) {
      return c.json({ error: 'Alert ID required' }, 400);
    }

    console.log(`[ALERTS API] Resolving alert ${alertId}`);
    
    // Use service role to bypass RLS
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      console.error('[ALERTS API] Error resolving alert:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all active alerts (for notifications bell - doctors/prestataires)
app.get(`${prefix}/alerts/active`, async (c) => {
  try {
    console.log('[ALERTS API] Fetching all active alerts');
    
    // Use service role to bypass RLS
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        id,
        type,
        severity,
        message,
        details,
        created_at,
        status,
        patient_id
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[ALERTS API] Error fetching active alerts:', error);
      
      // If table doesn't exist or is empty, return empty array
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        console.log('[ALERTS API] Alerts table not found or empty, returning empty array');
        return c.json({ 
          alerts: [],
          unreadCount: 0
        });
      }
      
      return c.json({ error: error.message }, 500);
    }

    console.log(`[ALERTS API] Found ${alerts?.length || 0} active alerts`);

    return c.json({ 
      alerts: alerts || [],
      unreadCount: alerts?.length || 0
    });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    
    // Return empty array on any error to avoid breaking the UI
    return c.json({ 
      alerts: [],
      unreadCount: 0
    });
  }
});

// ============================================
// GAMIFICATION ENGINE ROUTES
// ============================================

app.post(`${prefix}/gamification/update/:patientId`, async (c) => {
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

app.post(`${prefix}/gamification/process-night`, async (c) => {
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
// COMBINED WORKFLOW (Alert + Gamification)
// ============================================

app.post(`${prefix}/process-sleep-data`, async (c) => {
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
// REGISTER IOT ROUTES
// ============================================

registerIotRoutes(app, prefix);

// ============================================
// REGISTER BUSINESS ROUTES (PHASE 3)
// ============================================

app.route(`${prefix}/business`, businessRoutes);

// ============================================
// REGISTER PSC AUTH ROUTES (PHASE 3)
// ============================================

app.route(`${prefix}/auth/psc`, pscRoutes);

// ============================================
// REGISTER BILLING AUTOMATION ROUTES (PHASE 3)
// ============================================

app.route(`${prefix}/billing`, billingAutomation);

// ============================================
// PHASE 4 : INTELLIGENCE MÉDICALE & INTEROPÉRABILITÉ
// ============================================

// Import des nouveaux modules
import { normalizeData, smartNormalize, detectBrand, StandardizedData } from './adapters.ts';
import { patientToFHIR, telemetryToFHIR, deviceToFHIR, createFHIRBundle } from './fhir.ts';
import { generateReportHTML, convertHTMLToPDF, type ReportData } from './pdf-generator.ts';
import { createAutomaticTask, calculateDailyScore, saveTaskToDatabase, type Task } from './task-engine.ts';

// ============================================
// ROUTE : NORMALISATION DE DONNÉES MULTI-MARQUES
// ============================================

app.post(`${prefix}/normalize-device-data`, async (c) => {
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

app.post(`${prefix}/convert-to-fhir`, async (c) => {
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

app.post(`${prefix}/generate-report`, async (c) => {
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

app.post(`${prefix}/analyze-and-create-tasks`, async (c) => {
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

app.get(`${prefix}/tasks/:patientId`, async (c) => {
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

// ============================================
// ROUTE : WORKFLOW COMPLET (Demo)
// ============================================

app.post(`${prefix}/demo-full-workflow`, async (c) => {
  try {
    const body = await c.req.json();
    const { rawDeviceData, brand, patient, device } = body;

    console.log('[DEMO WORKFLOW] Starting full workflow...');

    // Étape 1 : Normaliser les données
    const normalized = brand 
      ? normalizeData(rawDeviceData, brand)
      : smartNormalize(rawDeviceData);
    
    console.log('[DEMO WORKFLOW] ✅ Step 1: Data normalized');

    // Étape 2 : Convertir en FHIR
    const fhirObservations = telemetryToFHIR(normalized, patient?.id);
    console.log('[DEMO WORKFLOW] ✅ Step 2: FHIR conversion done');

    // Étape 3 : Analyser et créer des tâches si nécessaire
    const triggers = createAutomaticTask(
      patient?.id || 'demo-patient',
      patient?.name || 'Patient Demo',
      normalized,
      []
    );
    console.log('[DEMO WORKFLOW] ✅ Step 3: Task analysis done');

    // Étape 4 : Calculer le score
    const scoreResult = calculateDailyScore(normalized);
    console.log('[DEMO WORKFLOW] ✅ Step 4: Score calculated');

    return c.json({
      success: true,
      workflow: {
        step1_normalized: normalized,
        step2_fhir: fhirObservations,
        step3_triggers: triggers,
        step4_score: scoreResult,
      },
      summary: {
        device_brand: normalized.device_brand,
        ahi: normalized.ahi,
        daily_score: scoreResult.score,
        tasks_generated: triggers.length,
        fhir_observations: fhirObservations.length,
      },
    });
  } catch (error: any) {
    console.error('[DEMO WORKFLOW] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// PHASE 5: AUTOMATION ROUTES
// ============================================

// Mount automation routes (imported at top of file)
app.route(`${prefix}/automation`, automationRoutes);

// ============================================
// START SERVER
// ============================================

Deno.serve(app.fetch);