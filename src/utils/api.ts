import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

// Singleton Supabase client
const supabase = createClient();

/**
 * Get a fresh access token from Supabase session
 * If no session, throws error to redirect user to login
 */
async function getFreshToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    console.error('[getFreshToken] No valid session:', error?.message);
    throw new Error('Session expired - please log in again');
  }
  
  // Update localStorage with fresh token
  localStorage.setItem('access_token', session.access_token);
  
  return session.access_token;
}

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, token } = options;

  // If token is provided, use it; otherwise get fresh token
  const authToken = token || await getFreshToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    // Log as info instead of error since we handle fallback gracefully
    console.log(`[API] Call to ${endpoint} failed, component will use fallback data:`, error);
    throw error;
  }
}

// Auth API
export const authApi = {
  signUp: (email: string, password: string, name: string, role: string, specialty?: string) =>
    apiCall('/auth/signup', {
      method: 'POST',
      body: { email, password, name, role, specialty },
    }),

  getMe: (token: string) =>
    apiCall('/auth/me', { token }),
};

// Patient API
export const patientApi = {
  getDashboard: (token: string) =>
    apiCall('/patient/dashboard', { token }),

  updateObservance: (token: string, data: any) =>
    apiCall('/patient/observance', {
      method: 'POST',
      token,
      body: data,
    }),
};

// Doctor API
export const doctorApi = {
  getDashboard: (token: string) =>
    apiCall('/doctor/dashboard', { token }),

  assignPatient: (token: string, patientId: string, doctorId?: string) =>
    apiCall('/doctor/assign-patient', {
      method: 'POST',
      token,
      body: { patient_id: patientId, doctor_id: doctorId },
    }),
};

// Admin API
export const adminApi = {
  getUsers: (token: string) =>
    apiCall('/admin/users', { token }),

  createSampleData: (token: string) =>
    apiCall('/admin/create-sample-data', {
      method: 'POST',
      token,
    }),
};