/**
 * AUDIT MIDDLEWARE - Conformité RGPD/HDS
 * Capture automatique de toutes les actions sensibles
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Types d'actions auditées
 */
export enum AuditAction {
  // Authentification
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Consultation données
  VIEW_PATIENT_DATA = 'VIEW_PATIENT_DATA',
  VIEW_SLEEP_DATA = 'VIEW_SLEEP_DATA',
  VIEW_MEDICAL_RECORD = 'VIEW_MEDICAL_RECORD',
  EXPORT_DATA = 'EXPORT_DATA',
  
  // Modification données
  UPDATE_PATIENT = 'UPDATE_PATIENT',
  UPDATE_SLEEP_DATA = 'UPDATE_SLEEP_DATA',
  UPDATE_PRESCRIPTION = 'UPDATE_PRESCRIPTION',
  DELETE_DATA = 'DELETE_DATA',
  
  // Actions admin
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
  DELETE_USER = 'DELETE_USER',
  UPDATE_RLS_POLICY = 'UPDATE_RLS_POLICY',
  
  // Actions prestataire
  CREATE_INTERVENTION = 'CREATE_INTERVENTION',
  RESOLVE_ALERT = 'RESOLVE_ALERT',
  UPDATE_DEVICE = 'UPDATE_DEVICE',
  
  // Autres
  DOWNLOAD_REPORT = 'DOWNLOAD_REPORT',
  SHARE_DATA = 'SHARE_DATA',
  API_CALL = 'API_CALL',
}

/**
 * Niveau de sensibilité de l'action
 */
export enum AuditSensitivity {
  LOW = 'low',       // Actions normales (consultation propres données)
  MEDIUM = 'medium', // Actions sensibles (consultation données autres)
  HIGH = 'high',     // Actions critiques (modification, export)
  CRITICAL = 'critical', // Actions très critiques (suppression, changement droits)
}

interface AuditLogEntry {
  user_id: string;
  action: AuditAction;
  details: Record<string, any>;
  sensitivity: AuditSensitivity;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  success: boolean;
  error_message?: string;
}

/**
 * Logger une action dans audit_logs
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        details: {
          ...entry.details,
          sensitivity: entry.sensitivity,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          success: entry.success,
          error_message: entry.error_message,
          timestamp: new Date().toISOString(),
        },
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      });

    if (error) {
      console.error('[AUDIT] Failed to log action:', error);
      // Ne pas bloquer l'opération si le log échoue
    }
  } catch (err) {
    console.error('[AUDIT] Exception logging action:', err);
  }
}

/**
 * Middleware Hono pour capturer automatiquement les requêtes API
 */
export function auditMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    // Récupérer les infos de la requête
    const method = c.req.method;
    const path = c.req.path;
    const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    // Récupérer l'utilisateur (si authentifié)
    const authHeader = c.req.header('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id || null;
      } catch {
        // Token invalide, continuer sans userId
      }
    }

    // Déterminer si c'est une route sensible
    const isSensitive = isSensitiveRoute(path);
    
    let success = true;
    let errorMessage: string | undefined;

    try {
      // Exécuter la route
      await next();
    } catch (error: any) {
      success = false;
      errorMessage = error.message || 'Unknown error';
      throw error;
    } finally {
      // Logger uniquement les routes sensibles ou en cas d'erreur
      // Ne pas logger si utilisateur anonyme et pas d'erreur
      if ((isSensitive || !success) && userId) {
        const duration = Date.now() - startTime;
        
        await logAuditAction({
          user_id: userId,
          action: AuditAction.API_CALL,
          details: {
            method,
            path,
            duration_ms: duration,
            status: success ? 'success' : 'error',
          },
          sensitivity: determineSensitivity(path, method),
          ip_address: ip,
          user_agent: userAgent,
          success,
          error_message: errorMessage,
        });
      }
    }
  };
}

/**
 * Détermine si une route est sensible
 */
function isSensitiveRoute(path: string): boolean {
  const sensitivePatterns = [
    '/patient/',
    '/doctor/',
    '/admin/',
    '/sleep-data',
    '/medical-records',
    '/export',
    '/interventions',
    '/alerts',
  ];

  return sensitivePatterns.some(pattern => path.includes(pattern));
}

/**
 * Détermine le niveau de sensibilité selon la route et la méthode
 */
function determineSensitivity(path: string, method: string): AuditSensitivity {
  // DELETE = toujours critique
  if (method === 'DELETE') {
    return AuditSensitivity.CRITICAL;
  }

  // Routes admin = critique
  if (path.includes('/admin/')) {
    return AuditSensitivity.CRITICAL;
  }

  // Modification données médicales = high
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (path.includes('/sleep-data') || path.includes('/medical-records')) {
      return AuditSensitivity.HIGH;
    }
  }

  // Consultation données patients = medium
  if (path.includes('/patient/') || path.includes('/doctor/')) {
    return AuditSensitivity.MEDIUM;
  }

  // Par défaut = low
  return AuditSensitivity.LOW;
}

/**
 * Helper pour logger manuellement une action spécifique
 */
export async function logAction(
  userId: string,
  action: AuditAction,
  details: Record<string, any>,
  sensitivity: AuditSensitivity = AuditSensitivity.MEDIUM
) {
  await logAuditAction({
    user_id: userId,
    action,
    details,
    sensitivity,
    success: true,
  });
}

/**
 * Helper pour logger un accès à des données patient
 */
export async function logPatientDataAccess(
  userId: string,
  patientId: string,
  dataType: string,
  ip?: string,
  userAgent?: string
) {
  await logAuditAction({
    user_id: userId,
    action: AuditAction.VIEW_PATIENT_DATA,
    details: {
      patient_id: patientId,
      data_type: dataType,
    },
    sensitivity: AuditSensitivity.MEDIUM,
    resource_type: 'patient_data',
    resource_id: patientId,
    ip_address: ip,
    user_agent: userAgent,
    success: true,
  });
}

/**
 * Helper pour logger un export de données (RGPD critique)
 */
export async function logDataExport(
  userId: string,
  exportType: string,
  recordCount: number,
  ip?: string
) {
  await logAuditAction({
    user_id: userId,
    action: AuditAction.EXPORT_DATA,
    details: {
      export_type: exportType,
      record_count: recordCount,
    },
    sensitivity: AuditSensitivity.HIGH,
    ip_address: ip,
    success: true,
  });
}