/**
 * CONNECTEUR YUWELL / YUYUE (Chine) - YuCloud API
 *
 * Auth : AppID + AppSecret
 * Machines : YH-450, YH-550, BreathCare
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface YuwellConfig {
  appId: string;
  appSecret: string;
}

export interface YuwellTherapyData {
  date: string;
  therapyTime: number;
  events: number;
  leak: number;
  pressure: number;
}

export const YUWELL_MACHINES = [
  'YH-450 Auto CPAP',
  'YH-480 Auto CPAP',
  'YH-550 Auto BiPAP',
  'YH-580 BiPAP S/T',
  'YH-720 BiPAP ST',
  'BreathCare PAP 20A',
  'BreathCare PAP 25A',
  'BreathCare PAP 25ST',
] as const;

export const YUWELL_DATA_FIELDS = [
  { key: 'therapyTime', label: 'Temps de therapie', unit: 'h' },
  { key: 'events', label: 'Evenements', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'pressure', label: 'Pression', unit: 'cmH2O' },
] as const;

// ---- API Client (stub) ----

const YUCLOUD_URL = 'https://api.yucloud.yuwell.com/v1';

export async function testYuwellConnection(config: YuwellConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.appId || !config.appSecret) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${YUCLOUD_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion YuCloud reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchYuwellData(
  config: YuwellConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<YuwellTherapyData[]> {
  // Get access token first
  const authResp = await fetch(`${YUCLOUD_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  });
  if (!authResp.ok) throw new Error('Auth failed');
  const { access_token } = await authResp.json();

  const response = await fetch(
    `${YUCLOUD_URL}/patients/${patientId}/therapy?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface YuwellConnectorFormProps {
  config: YuwellConfig;
  onChange: (config: YuwellConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function YuwellConnectorForm({ config, onChange, onTest, testStatus, testing }: YuwellConnectorFormProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <span className="text-emerald-700 font-bold text-sm">YW</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Yuwell / Yuyue</h3>
          <p className="text-xs text-muted-foreground">YuCloud API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">App ID</label>
        <input
          type="text"
          value={config.appId}
          onChange={e => onChange({ ...config, appId: e.target.value })}
          placeholder="Votre App ID YuCloud"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">App Secret</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={config.appSecret}
            onChange={e => onChange({ ...config, appSecret: e.target.value })}
            placeholder="Votre App Secret"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.appId || !config.appSecret}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {YUWELL_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {YUWELL_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default YuwellConnectorForm;
