/**
 * CONNECTEUR DEVILBISS / DRIVE MEDICAL - SmartLink API
 *
 * Auth : Username + Password + API Key
 * Machines : IntelliPAP, Blue series
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface DeVilbissConfig {
  username: string;
  password: string;
  apiKey: string;
}

export interface DeVilbissTherapyData {
  date: string;
  compliance: number;
  ahi: number;
  leak: number;
  pressure: number;
}

export const DEVILBISS_MACHINES = [
  'IntelliPAP AutoAdjust',
  'IntelliPAP Standard',
  'IntelliPAP BiLevel S',
  'IntelliPAP 2 AutoAdjust',
  'Blue Auto',
  'Blue Auto Plus',
  'Blue BiLevel ST',
] as const;

export const DEVILBISS_DATA_FIELDS = [
  { key: 'compliance', label: 'Observance', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'pressure', label: 'Pression', unit: 'cmH2O' },
] as const;

// ---- API Client (stub) ----

const SMARTLINK_URL = 'https://api.smartlink.drivemedical.com/v1';

export async function testDeVilbissConnection(config: DeVilbissConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.username || !config.password || !config.apiKey) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${SMARTLINK_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion SmartLink reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchDeVilbissData(
  config: DeVilbissConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<DeVilbissTherapyData[]> {
  // First authenticate
  const authResponse = await fetch(`${SMARTLINK_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({ username: config.username, password: config.password }),
  });
  if (!authResponse.ok) throw new Error('Auth failed');
  const { token } = await authResponse.json();

  const response = await fetch(
    `${SMARTLINK_URL}/patients/${patientId}/therapy?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${token}`, 'X-API-Key': config.apiKey } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface DeVilbissConnectorFormProps {
  config: DeVilbissConfig;
  onChange: (config: DeVilbissConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function DeVilbissConnectorForm({ config, onChange, onTest, testStatus, testing }: DeVilbissConnectorFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <span className="text-orange-700 font-bold text-sm">DV</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">DeVilbiss / Drive Medical</h3>
          <p className="text-xs text-muted-foreground">SmartLink API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Username</label>
        <input
          type="text"
          value={config.username}
          onChange={e => onChange({ ...config, username: e.target.value })}
          placeholder="Nom d'utilisateur SmartLink"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={config.password}
            onChange={e => onChange({ ...config, password: e.target.value })}
            placeholder="Mot de passe"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={e => onChange({ ...config, apiKey: e.target.value })}
            placeholder="Cle API SmartLink"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.username || !config.password || !config.apiKey}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Tester la connexion
        </button>
        {testStatus && (
          <span className={`flex items-center gap-1 text-sm ${testStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
            {testStatus.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {testStatus.message}
          </span>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Machines supportees</p>
        <div className="flex flex-wrap gap-1">
          {DEVILBISS_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {DEVILBISS_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DeVilbissConnectorForm;
