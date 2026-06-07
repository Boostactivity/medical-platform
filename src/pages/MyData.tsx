/**
 * Page Mes Données - Dashboard IoT Patient
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyDataPage } from '../components/patient/MyDataPage';
import { LogOut, Home } from 'lucide-react';

export function MyData() {
  const [userId, setUserId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/patient/connexion');
      return;
    }

    // Extract user ID from token or use demo
    const demoUserId = 'demo-patient-' + Date.now();
    setUserId(demoUserId);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    navigate('/patient/connexion');
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/patient/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Retour au dashboard</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <MyDataPage userId={userId} />
    </div>
  );
}
