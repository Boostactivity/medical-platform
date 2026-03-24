import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface WearableDevice {
  id: string;
  name: string;
  icon: string;
  description: string;
  dataTypes: string[];
  connected: boolean;
  lastSync?: string;
}

const WEARABLE_DEVICES: WearableDevice[] = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    icon: '\u2764\uFE0F',
    description: 'iPhone, Apple Watch - Frequence cardiaque, SpO2, phases de sommeil',
    dataTypes: ['heart_rate', 'spo2', 'sleep_stages', 'movement'],
    connected: false,
  },
  {
    id: 'google-fit',
    name: 'Google Fit',
    icon: '\uD83C\uDFC3',
    description: 'Android, Wear OS - Activite, sommeil, frequence cardiaque',
    dataTypes: ['heart_rate', 'sleep_stages', 'movement', 'steps'],
    connected: false,
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '\u231A',
    description: 'Trackers Fitbit - SpO2, sommeil detaille, stress',
    dataTypes: ['heart_rate', 'spo2', 'sleep_stages', 'movement', 'stress'],
    connected: false,
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: '\uD83D\uDCAD',
    description: 'Bague Oura - Temperature, HRV, sommeil haute precision',
    dataTypes: ['heart_rate', 'hrv', 'temperature', 'sleep_stages', 'spo2'],
    connected: false,
  },
];

// Donnees de demonstration pour le graphique combine
const MOCK_COMBINED_DATA = Array.from({ length: 8 }, (_, i) => {
  const hour = 22 + i;
  const displayHour = hour >= 24 ? hour - 24 : hour;
  return {
    heure: `${String(displayHour).padStart(2, '0')}:00`,
    ppc_pression: 8 + Math.random() * 4,
    ppc_fuites: Math.random() * 15,
    wearable_fc: 55 + Math.random() * 15,
    wearable_spo2: 93 + Math.random() * 5,
  };
});

function computeSuperScore(ppcScore: number, wearableData: {
  fcMoyenne: number; spo2Moyenne: number; tempsNrem3Pct: number;
}): number {
  // Ponderation : PPC 50%, FC nocturne 15%, SpO2 20%, sommeil profond 15%
  const fcScore = Math.max(0, Math.min(100, 100 - Math.abs(wearableData.fcMoyenne - 60) * 2));
  const spo2Score = Math.max(0, Math.min(100, (wearableData.spo2Moyenne - 88) * 8.33));
  const deepSleepScore = Math.min(100, wearableData.tempsNrem3Pct * 5);

  return Math.round(
    ppcScore * 0.50 +
    fcScore * 0.15 +
    spo2Score * 0.20 +
    deepSleepScore * 0.15
  );
}

export function WearableSync() {
  const [devices, setDevices] = useState<WearableDevice[]>(WEARABLE_DEVICES);
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectedDevices = devices.filter(d => d.connected);
  const superScore = connectedDevices.length > 0
    ? computeSuperScore(78, { fcMoyenne: 62, spo2Moyenne: 95.5, tempsNrem3Pct: 18 })
    : null;

  const handleConnect = async (deviceId: string) => {
    setConnecting(deviceId);
    // Simulation d'une connexion OAuth
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDevices(prev => prev.map(d =>
      d.id === deviceId
        ? { ...d, connected: !d.connected, lastSync: d.connected ? undefined : new Date().toLocaleString('fr-FR') }
        : d
    ));
    setConnecting(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[var(--chart-4)]/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--chart-4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Objets connectes</h3>
            <p className="text-sm text-muted-foreground">Enrichissez vos donnees PPC avec vos wearables</p>
          </div>
        </div>
      </div>

      {/* Super Score */}
      {superScore !== null && (
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--sleep)] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Super Score enrichi</p>
              <p className="text-xs text-white/60 mt-1">PPC + Wearable combines</p>
            </div>
            <div className="text-right">
              <span className="text-5xl font-bold">{superScore}</span>
              <span className="text-white/70 text-lg">/100</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold">78</p>
              <p className="text-xs text-white/70">Score PPC</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">62</p>
              <p className="text-xs text-white/70">FC moy.</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">95.5%</p>
              <p className="text-xs text-white/70">SpO2 moy.</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">18%</p>
              <p className="text-xs text-white/70">Sommeil prof.</p>
            </div>
          </div>
        </div>
      )}

      {/* Devices */}
      <div className="space-y-3">
        {devices.map(device => (
          <div key={device.id}
            className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{device.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{device.name}</h4>
                  {device.connected && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                      Connecte
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{device.description}</p>
                {device.lastSync && (
                  <p className="text-xs text-muted-foreground mt-1">Derniere synchro : {device.lastSync}</p>
                )}
                <div className="flex gap-1 mt-1.5">
                  {device.dataTypes.map(dt => (
                    <span key={dt} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {dt === 'heart_rate' ? 'FC' :
                       dt === 'spo2' ? 'SpO2' :
                       dt === 'sleep_stages' ? 'Phases' :
                       dt === 'movement' ? 'Mvmt' :
                       dt === 'hrv' ? 'HRV' :
                       dt === 'temperature' ? 'Temp' :
                       dt === 'steps' ? 'Pas' :
                       dt === 'stress' ? 'Stress' : dt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleConnect(device.id)}
              disabled={connecting !== null}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                device.connected
                  ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              } ${connecting === device.id ? 'opacity-50 cursor-wait' : ''}`}
            >
              {connecting === device.id
                ? 'Connexion...'
                : device.connected ? 'Deconnecter' : 'Connecter'}
            </button>
          </div>
        ))}
      </div>

      {/* Graphique combine */}
      {connectedDevices.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h4 className="font-semibold text-foreground mb-4">Donnees combinees PPC + Wearable (nuit derniere)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MOCK_COMBINED_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="heure" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="right" orientation="right" domain={[85, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--foreground)',
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="ppc_pression" name="Pression PPC (cmH2O)" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="wearable_fc" name="Freq. cardiaque (bpm)" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="wearable_spo2" name="SpO2 (%)" stroke="var(--success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Le croisement PPC/wearable permet de detecter les desaturations non capturees par la machine PPC seule.
          </p>
        </div>
      )}

      {/* Donnees recuperees */}
      <div className="bg-muted/50 rounded-xl p-4">
        <h5 className="text-sm font-medium text-foreground mb-2">Donnees exploitees</h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>- Frequence cardiaque nocturne (detection bradycardie/tachycardie)</li>
          <li>- SpO2 continue (comparaison avec oxymetre PPC)</li>
          <li>- Phases de sommeil (leger, profond, REM) pour correler avec evenements PPC</li>
          <li>- Mouvements nocturnes (detection micro-eveils non captures par la PPC)</li>
          <li>- HRV (variabilite cardiaque = indicateur de qualite de recuperation)</li>
        </ul>
      </div>
    </div>
  );
}

export default WearableSync;
