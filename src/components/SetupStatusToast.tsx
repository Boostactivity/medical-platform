import { useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { apiCall, ApiError } from '../utils/api';

export function SetupStatusToast() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if tables are configured (only for admin role)
    const checkSetupStatus = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      // Only check for admin users
      const role = localStorage.getItem('user_role');
      if (role !== 'admin' && role !== 'prestataire') return;

      // Check if we're already on setup page
      if (window.location.pathname === '/setup-prestataire') return;

      try {
        await apiCall('/prestataire/alerts', { token });
      } catch (err) {
        if (err instanceof ApiError) {
          const error = err.payload || {};
          if (error.details?.includes('does not exist') || error.error?.includes('does not exist')) {
            // Tables don't exist - show toast
            toast.error('Configuration requise', {
              description: 'Les tables prestataire doivent être créées',
              duration: 10000,
              action: {
                label: 'Configurer',
                onClick: () => navigate('/setup-prestataire'),
              },
            });
          }
        } else {
          // Silent fail - network error or other issue
          console.log('[SetupStatusToast] Check skipped:', err);
        }
      }
    };

    // Check after a short delay to avoid blocking initial render
    const timer = setTimeout(checkSetupStatus, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return null;
}
