import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

// Singleton Supabase client
const supabase = createClient();

/**
 * Erreur API structurée : status HTTP + payload JSON renvoyé par le serveur.
 */
export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

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

interface CoreFetchOptions {
  method?: string;
  body?: any;
  authToken: string;
}

/**
 * Core fetch vers les Edge Functions : headers JSON + Bearer, throw ApiError si !ok.
 * Retourne la Response brute (pour les cas blob/CSV).
 */
async function coreFetch(endpoint: string, options: CoreFetchOptions): Promise<Response> {
  const { method = 'GET', body, authToken } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error || payload?.message || `API error: ${response.status}`;
    console.error(`[API] ${method} ${endpoint} failed (${response.status}):`, message);
    throw new ApiError(message, response.status, payload);
  }

  return response;
}

/**
 * Appel authentifié (token session Supabase frais, ou token explicite).
 * Throw ApiError (status + payload) en cas d'erreur HTTP.
 */
export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, token } = options;

  // If token is provided, use it; otherwise get fresh token
  const authToken = token || await getFreshToken();

  const response = await coreFetch(endpoint, { method, body, authToken });
  return response.json();
}

/**
 * Helpers REST construits sur apiCall (token session automatique).
 */
export const api = {
  get: (endpoint: string) => apiCall(endpoint),
  post: (endpoint: string, body?: any) => apiCall(endpoint, { method: 'POST', body }),
  patch: (endpoint: string, body?: any) => apiCall(endpoint, { method: 'PATCH', body }),
  delete: (endpoint: string) => apiCall(endpoint, { method: 'DELETE' }),
};

/**
 * Appel non-authentifié : Authorization = publicAnonKey (endpoints publics).
 */
export async function apiPublic(
  endpoint: string,
  options: { method?: string; body?: any } = {},
) {
  const response = await coreFetch(endpoint, { ...options, authToken: publicAnonKey });
  return response.json();
}

/**
 * Variante de apiPublic qui retourne la Response brute (téléchargements blob/CSV).
 * Throw ApiError comme les autres helpers si la réponse est en erreur.
 */
export async function apiPublicRaw(
  endpoint: string,
  options: { method?: string; body?: any } = {},
): Promise<Response> {
  return coreFetch(endpoint, { ...options, authToken: publicAnonKey });
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
