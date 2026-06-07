import { AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SetupWarningBannerProps {
  alertsError?: Error | string | null;
  interventionsError?: Error | string | null;
}

export function SetupWarningBanner({ alertsError, interventionsError }: SetupWarningBannerProps) {
  // Convertir les erreurs en strings de manière sécurisée
  const getErrorMessage = (error: Error | string | null | undefined): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      // Handle PostgreSQL error objects
      if ('message' in error) {
        return String(error.message || '');
      }
      // Handle other error objects
      if ('code' in error || 'details' in error) {
        return JSON.stringify(error);
      }
    }
    return String(error);
  };

  const alertsErrorMsg = getErrorMessage(alertsError);
  const interventionsErrorMsg = getErrorMessage(interventionsError);
  
  const hasTableError = 
    (alertsErrorMsg && (
      alertsErrorMsg.includes('does not exist') || 
      alertsErrorMsg.includes('PGRST205') ||
      alertsErrorMsg.includes('permission denied')
    )) ||
    (interventionsErrorMsg && (
      interventionsErrorMsg.includes('does not exist') ||
      interventionsErrorMsg.includes('PGRST205') ||
      interventionsErrorMsg.includes('permission denied')
    ));

  if (!hasTableError) return null;

  return (
    <div className="bg-[#CE0500]/10 border border-[#CE0500]/20 rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-[#CE0500] flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-[#1A1A1A] font-medium mb-2">
            ⚠️ Configuration requise
          </h3>
          <p className="text-sm text-[#5C5C5C] mb-4">
            Les tables de la base de données ne sont pas encore créées. Vous devez exécuter le script SQL de configuration.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/setup-prestataire"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#CE0500] text-white rounded-lg hover:bg-[#CE0500] transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Configurer maintenant
            </Link>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#007AFF] hover:underline"
            >
              Ouvrir Supabase →
            </a>
          </div>
        </div>
      </div>
      
      {/* Technical details */}
      <details className="mt-4">
        <summary className="text-xs text-[#5C5C5C] cursor-pointer hover:text-[#1A1A1A]">
          Détails techniques
        </summary>
        <div className="mt-2 p-3 bg-white rounded-lg">
          {alertsErrorMsg && (
            <div className="mb-2">
              <p className="text-xs font-medium text-[#CE0500] mb-1">Alerts Error:</p>
              <pre className="text-xs text-[#5C5C5C] font-mono whitespace-pre-wrap">
                {alertsErrorMsg}
              </pre>
            </div>
          )}
          {interventionsErrorMsg && (
            <div>
              <p className="text-xs font-medium text-[#CE0500] mb-1">Interventions Error:</p>
              <pre className="text-xs text-[#5C5C5C] font-mono whitespace-pre-wrap">
                {interventionsErrorMsg}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}