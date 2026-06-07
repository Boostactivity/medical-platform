import { useEffect, useState } from 'react';
import { apiCall, ApiError } from '../utils/api';

interface DiagnosticResult {
  token: {
    exists: boolean;
    value?: string;
  };
  api: {
    alerts: 'success' | 'error' | 'pending';
    alertsError?: string;
    interventions: 'success' | 'error' | 'pending';
    interventionsError?: string;
  };
  user: {
    role?: string;
    email?: string;
  };
}

/**
 * Hook de diagnostic pour identifier les problèmes
 * Utile en développement pour debug
 */
export const useDiagnostic = () => {
  const [result, setResult] = useState<DiagnosticResult>({
    token: { exists: false },
    api: {
      alerts: 'pending',
      interventions: 'pending',
    },
    user: {},
  });

  useEffect(() => {
    const runDiagnostic = async () => {
      const token = localStorage.getItem('access_token');
      const userRole = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');

      const diagnosticResult: DiagnosticResult = {
        token: {
          exists: !!token,
          value: token ? `${token.substring(0, 20)}...` : undefined,
        },
        api: {
          alerts: 'pending',
          interventions: 'pending',
        },
        user: {
          role: userRole || undefined,
          email: userEmail || undefined,
        },
      };

      if (!token) {
        console.warn('[DIAGNOSTIC] ❌ No authentication token found');
        setResult(diagnosticResult);
        return;
      }

      // Test alerts endpoint
      try {
        const data = await apiCall('/prestataire/alerts', { token });
        diagnosticResult.api.alerts = 'success';
        console.log('[DIAGNOSTIC] ✅ Alerts API working:', data);
      } catch (err: any) {
        diagnosticResult.api.alerts = 'error';
        diagnosticResult.api.alertsError = err instanceof ApiError
          ? (err.payload?.error || `HTTP ${err.status}`)
          : err.message;
        console.error('[DIAGNOSTIC] ❌ Alerts API error:', err);
      }

      // Test interventions endpoint
      try {
        const data = await apiCall('/prestataire/interventions?status=all', { token });
        diagnosticResult.api.interventions = 'success';
        console.log('[DIAGNOSTIC] ✅ Interventions API working:', data);
      } catch (err: any) {
        diagnosticResult.api.interventions = 'error';
        diagnosticResult.api.interventionsError = err instanceof ApiError
          ? (err.payload?.error || `HTTP ${err.status}`)
          : err.message;
        console.error('[DIAGNOSTIC] ❌ Interventions API error:', err);
      }

      setResult(diagnosticResult);

      // Print summary
      console.group('[DIAGNOSTIC] 🔍 System Status Summary');
      console.log('Token:', diagnosticResult.token.exists ? '✅ Present' : '❌ Missing');
      console.log('User Role:', diagnosticResult.user.role || '⚠️ Unknown');
      console.log('Alerts API:', diagnosticResult.api.alerts === 'success' ? '✅ Working' : '❌ Failed');
      if (diagnosticResult.api.alertsError) {
        console.log('  └─ Error:', diagnosticResult.api.alertsError);
      }
      console.log('Interventions API:', diagnosticResult.api.interventions === 'success' ? '✅ Working' : '❌ Failed');
      if (diagnosticResult.api.interventionsError) {
        console.log('  └─ Error:', diagnosticResult.api.interventionsError);
      }
      console.groupEnd();

      // Recommendations
      if (!diagnosticResult.token.exists) {
        console.warn('[DIAGNOSTIC] 💡 Recommendation: Please log in to get an access token');
      } else if (diagnosticResult.api.alerts === 'error' || diagnosticResult.api.interventions === 'error') {
        const alertsError = diagnosticResult.api.alertsError || '';
        const interventionsError = diagnosticResult.api.interventionsError || '';
        
        if (alertsError.includes('does not exist') || interventionsError.includes('does not exist')) {
          console.error('[DIAGNOSTIC] 💡 Recommendation: Tables missing! Run /supabase/migrations/create-prestataire-tables.sql');
        } else if (alertsError.includes('Unauthorized') || interventionsError.includes('Unauthorized')) {
          console.error('[DIAGNOSTIC] 💡 Recommendation: Token expired or invalid. Please log in again.');
        } else if (alertsError.includes('Forbidden') || interventionsError.includes('Forbidden')) {
          console.error('[DIAGNOSTIC] 💡 Recommendation: User role insufficient. Need admin or prestataire role.');
        }
      }
    };

    runDiagnostic();
  }, []);

  return result;
};

/**
 * Display diagnostic in console on mount
 * Usage: Add <DiagnosticLogger /> in your component
 */
export const DiagnosticLogger = () => {
  useDiagnostic();
  return null;
};
