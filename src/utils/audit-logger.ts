/**
 * AUDIT LOGGER - Frontend
 * Sprint 0 - Sécurité & Infrastructure
 * 
 * Enregistre les actions utilisateurs importantes côté frontend
 * (Complète les triggers SQL côté backend)
 */

import { createClient } from './supabase/client';
import { captureMessage, addBreadcrumb } from './sentry';

const supabase = createClient();

// Types d'actions auditées
export type AuditAction = 
  | 'login'
  | 'logout'
  | 'view_patient_data'
  | 'download_report'
  | 'export_data'
  | 'change_settings'
  | 'delete_account_request'
  | 'consent_gdpr'
  | 'revoke_consent'
  | 'access_medical_data'
  | 'share_data';

export interface AuditLogEntry {
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enregistre une action dans les audit logs
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.id) {
      console.warn('[Audit] No user authenticated, skipping log');
      return;
    }

    // Valider que user.id est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      console.warn('[Audit] Invalid user ID format, skipping log');
      return;
    }

    // Récupérer les infos réseau (si disponibles)
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;

    // Créer l'entrée audit
    const auditEntry = {
      table_name: 'frontend_actions',
      record_id: crypto.randomUUID(),
      operation: 'INSERT',
      new_data: {
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        metadata: entry.metadata,
        user_id: user.id,
        user_email: user.email,
        timestamp: new Date().toISOString(),
      },
      changed_by: user.id,
      changed_by_role: user.user_metadata?.role || 'unknown',
      changed_by_email: user.email,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    // Enregistrer dans audit_logs
    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      console.error('[Audit] Failed to log action:', error);
      
      // Fallback : Envoyer à Sentry
      captureMessage(`Audit log failed: ${entry.action}`, 'warning');
    } else {
      console.log(`[Audit] Action logged: ${entry.action}`);
      
      // Ajouter un breadcrumb Sentry
      addBreadcrumb(`Audit: ${entry.action}`, {
        resource: entry.resource,
        resourceId: entry.resourceId,
      });
    }
  } catch (error) {
    console.error('[Audit] Exception while logging:', error);
  }
}

/**
 * Récupère l'IP publique de l'utilisateur (approximation)
 */
async function getUserIP(): Promise<string | null> {
  try {
    // Utiliser un service externe (rapide et gratuit)
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000), // Timeout 2s
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null; // Pas critique si échoue
  }
}

/**
 * Hooks pré-définis pour actions courantes
 */

export function logLogin() {
  logAuditAction({
    action: 'login',
    metadata: {
      platform: 'web',
      timestamp: new Date().toISOString(),
    },
  });
}

export function logLogout() {
  logAuditAction({
    action: 'logout',
    metadata: {
      platform: 'web',
      timestamp: new Date().toISOString(),
    },
  });
}

export function logViewPatientData(patientId: string) {
  logAuditAction({
    action: 'view_patient_data',
    resource: 'patient_profile',
    resourceId: patientId,
    metadata: {
      view_type: 'dashboard',
    },
  });
}

export function logDownloadReport(reportType: string, patientId?: string) {
  logAuditAction({
    action: 'download_report',
    resource: 'report',
    resourceId: patientId,
    metadata: {
      report_type: reportType,
      format: 'pdf',
    },
  });
}

export function logExportData(dataType: string, format: string) {
  logAuditAction({
    action: 'export_data',
    resource: dataType,
    metadata: {
      format,
      timestamp: new Date().toISOString(),
    },
  });
}

export function logAccessMedicalData(dataType: string, patientId: string) {
  logAuditAction({
    action: 'access_medical_data',
    resource: dataType,
    resourceId: patientId,
    metadata: {
      access_type: 'read',
    },
  });
}

export function logConsentGDPR(consentType: string, accepted: boolean) {
  logAuditAction({
    action: 'consent_gdpr',
    resource: 'gdpr_consent',
    metadata: {
      consent_type: consentType,
      accepted,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Hook React pour logger automatiquement l'accès à une page
 */
export function usePageAccessLog(pageName: string, resourceId?: string) {
  React.useEffect(() => {
    logAuditAction({
      action: 'view_patient_data',
      resource: pageName,
      resourceId,
      metadata: {
        page: pageName,
      },
    });
  }, [pageName, resourceId]);
}

/**
 * HOC pour wrapper un composant et logger l'accès
 */
export function withAuditLog<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string
) {
  return function AuditedComponent(props: P) {
    React.useEffect(() => {
      logAuditAction({
        action: 'view_patient_data',
        resource: pageName,
        metadata: {
          component: Component.name || 'Anonymous',
        },
      });
    }, []);

    return <Component {...props} />;
  };
}

/**
 * Récupérer les audit logs (Admin uniquement)
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    // Appliquer les filtres
    if (filters?.userId) {
      query = query.eq('changed_by', filters.userId);
    }

    if (filters?.action) {
      query = query.contains('new_data', { action: filters.action });
    }

    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Audit] Failed to fetch logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Audit] Exception while fetching logs:', error);
    return [];
  }
}

/**
 * Générer un rapport d'audit (Admin uniquement)
 */
export async function generateAuditReport(
  startDate: Date,
  endDate: Date
): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  userActivity: Array<{ userId: string; actions: number }>;
}> {
  const logs = await getAuditLogs({ startDate, endDate, limit: 10000 });

  const actionsByType: Record<string, number> = {};
  const userActivity: Map<string, number> = new Map();

  logs.forEach((log) => {
    const action = log.new_data?.action || 'unknown';
    const userId = log.changed_by;

    // Compter par type d'action
    actionsByType[action] = (actionsByType[action] || 0) + 1;

    // Compter par utilisateur
    userActivity.set(userId, (userActivity.get(userId) || 0) + 1);
  });

  return {
    totalActions: logs.length,
    actionsByType,
    userActivity: Array.from(userActivity.entries()).map(([userId, actions]) => ({
      userId,
      actions,
    })),
  };
}

// Export React namespace pour les hooks
import * as React from 'react';