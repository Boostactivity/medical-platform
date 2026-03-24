/**
 * MULTI-MARQUES MACHINES PPC
 *
 * Support ResMed (AirSense 10/11), Philips (DreamStation), Lowenstein (prisma)
 * Configuration par patient, adaptation affichage par fabricant, dashboard unifie
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor, Settings, Search, Filter, ChevronDown, ChevronRight,
  User, Activity, BarChart3, Gauge, Wind, Clock, Droplets,
  Wifi, Bluetooth, HardDrive, CheckCircle, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ---- Types ----

type Manufacturer = 'resmed' | 'philips' | 'lowenstein';
type DeviceModel = string;
type ConnectionType = 'wifi' | 'cellular' | 'bluetooth' | 'sd_card';

interface ManufacturerConfig {
  id: Manufacturer;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  models: { id: string; name: string }[];
  metrics: {
    key: string;
    label: string;
    unit: string;
    description: string;
  }[];
}

interface DeviceAssignment {
  id: string;
  patientId: string;
  patientName: string;
  manufacturer: Manufacturer;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  connectionType: ConnectionType;
  lastSync: string;
  status: 'active' | 'inactive' | 'maintenance';
  metrics: {
    usageHours: number;
    iah: number;
    leakRate: number;
    pressureAvg: number;
    pressureP95: number;
    // Manufacturer-specific
    epap?: number;
    ipap?: number;
    tidalVolume?: number;
    minuteVentilation?: number;
    respiratoryRate?: number;
    csr?: number; // Cheyne-Stokes respiration (ResMed)
    oai?: number; // Obstructive Apnea Index
    cai?: number; // Central Apnea Index
    hi?: number;  // Hypopnea Index
  };
}

// ---- Config Fabricants ----

const MANUFACTURERS: ManufacturerConfig[] = [
  {
    id: 'resmed',
    name: 'ResMed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    models: [
      { id: 'airsense10', name: 'AirSense 10 AutoSet' },
      { id: 'airsense11', name: 'AirSense 11 AutoSet' },
      { id: 'aircurve10', name: 'AirCurve 10 VAuto' },
    ],
    metrics: [
      { key: 'usageHours', label: 'Heures utilisation', unit: 'h', description: 'Duree d\'utilisation quotidienne' },
      { key: 'iah', label: 'IAH (myAir)', unit: '/h', description: 'Indice Apnee-Hypopnee' },
      { key: 'leakRate', label: 'Fuite masque', unit: 'L/min', description: 'Debit de fuite (95e percentile)' },
      { key: 'pressureAvg', label: 'Pression mediane', unit: 'cmH2O', description: 'Pression therapeutique mediane' },
      { key: 'pressureP95', label: 'Pression P95', unit: 'cmH2O', description: 'Pression 95e percentile' },
      { key: 'csr', label: 'CSR', unit: '%', description: 'Respiration de Cheyne-Stokes' },
    ],
  },
  {
    id: 'philips',
    name: 'Philips Respironics',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    models: [
      { id: 'dreamstation2', name: 'DreamStation 2 Auto' },
      { id: 'dreamstation', name: 'DreamStation Auto' },
      { id: 'systemone', name: 'System One REMstar' },
    ],
    metrics: [
      { key: 'usageHours', label: 'Heures utilisation', unit: 'h', description: 'Duree d\'utilisation' },
      { key: 'iah', label: 'AHI', unit: '/h', description: 'Apnea-Hypopnea Index' },
      { key: 'oai', label: 'OAI', unit: '/h', description: 'Obstructive Apnea Index' },
      { key: 'cai', label: 'CAI', unit: '/h', description: 'Central Apnea Index' },
      { key: 'hi', label: 'HI', unit: '/h', description: 'Hypopnea Index' },
      { key: 'leakRate', label: 'Large Leak', unit: '%', description: 'Pourcentage temps grande fuite' },
      { key: 'pressureAvg', label: 'Pression moyenne', unit: 'cmH2O', description: 'Pression therapeutique moyenne' },
    ],
  },
  {
    id: 'lowenstein',
    name: 'Lowenstein',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    models: [
      { id: 'prismasmart', name: 'prisma SMART' },
      { id: 'prisma20a', name: 'prisma 20A' },
      { id: 'prismavent', name: 'prismaVENT' },
    ],
    metrics: [
      { key: 'usageHours', label: 'Heures utilisation', unit: 'h', description: 'Duree d\'utilisation' },
      { key: 'iah', label: 'AHI', unit: '/h', description: 'Indice d\'apnee-hypopnee' },
      { key: 'leakRate', label: 'Fuite non intentionnelle', unit: 'L/min', description: 'Fuite non intentionnelle' },
      { key: 'pressureAvg', label: 'Pression therapeutique', unit: 'cmH2O', description: 'Pression therapeutique moyenne' },
      { key: 'tidalVolume', label: 'Volume courant', unit: 'mL', description: 'Volume courant moyen (prisma)' },
      { key: 'minuteVentilation', label: 'Ventilation minute', unit: 'L/min', description: 'Ventilation minute' },
      { key: 'respiratoryRate', label: 'Freq. respiratoire', unit: '/min', description: 'Frequence respiratoire' },
    ],
  },
];

// ---- Mock Data ----

const MOCK_DEVICES: DeviceAssignment[] = [
  {
    id: 'd1', patientId: 'p1', patientName: 'Jean Dupont',
    manufacturer: 'resmed', model: 'AirSense 11 AutoSet',
    serialNumber: 'RS11-2023-00142', firmwareVersion: '11.2.4',
    connectionType: 'wifi', lastSync: '2026-03-24T06:30:00', status: 'active',
    metrics: { usageHours: 6.2, iah: 2.3, leakRate: 12.5, pressureAvg: 9.4, pressureP95: 12.1, csr: 0.5 },
  },
  {
    id: 'd2', patientId: 'p2', patientName: 'Marie Martin',
    manufacturer: 'philips', model: 'DreamStation 2 Auto',
    serialNumber: 'PDS2-2021-00089', firmwareVersion: '2.3.1',
    connectionType: 'bluetooth', lastSync: '2026-03-23T07:15:00', status: 'active',
    metrics: { usageHours: 4.8, iah: 4.1, leakRate: 8, pressureAvg: 10.2, pressureP95: 13.5, oai: 1.2, cai: 0.8, hi: 2.1 },
  },
  {
    id: 'd3', patientId: 'p3', patientName: 'Pierre Bernard',
    manufacturer: 'resmed', model: 'AirSense 10 AutoSet',
    serialNumber: 'RS10-2020-00331', firmwareVersion: '10.1.8',
    connectionType: 'sd_card', lastSync: '2026-03-15T00:00:00', status: 'active',
    metrics: { usageHours: 3.5, iah: 5.8, leakRate: 28, pressureAvg: 11.0, pressureP95: 14.2, csr: 1.2 },
  },
  {
    id: 'd4', patientId: 'p4', patientName: 'Paul Durand',
    manufacturer: 'lowenstein', model: 'prisma SMART',
    serialNumber: 'LPS-2024-00015', firmwareVersion: '4.5.0',
    connectionType: 'wifi', lastSync: '2026-03-24T05:45:00', status: 'active',
    metrics: { usageHours: 7.1, iah: 1.8, leakRate: 8.3, pressureAvg: 8.5, pressureP95: 11.0, tidalVolume: 520, minuteVentilation: 7.2, respiratoryRate: 14 },
  },
  {
    id: 'd5', patientId: 'p5', patientName: 'Sophie Leroy',
    manufacturer: 'philips', model: 'DreamStation Auto',
    serialNumber: 'PDS-2022-00234', firmwareVersion: '1.8.2',
    connectionType: 'cellular', lastSync: '2026-03-24T06:00:00', status: 'active',
    metrics: { usageHours: 5.5, iah: 3.2, leakRate: 5, pressureAvg: 9.8, pressureP95: 12.8, oai: 0.9, cai: 0.5, hi: 1.8 },
  },
  {
    id: 'd6', patientId: 'p6', patientName: 'Claire Petit',
    manufacturer: 'resmed', model: 'AirCurve 10 VAuto',
    serialNumber: 'AC10-2023-00078', firmwareVersion: '10.3.2',
    connectionType: 'wifi', lastSync: '2026-03-24T07:00:00', status: 'maintenance',
    metrics: { usageHours: 5.9, iah: 2.7, leakRate: 15, pressureAvg: 10.5, pressureP95: 13.8, csr: 0.3 },
  },
];

// ---- Composant Principal ----

export default function MultiDeviceSupport() {
  const [devices] = useState<DeviceAssignment[]>(MOCK_DEVICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState<Manufacturer | 'all'>('all');
  const [selectedDevice, setSelectedDevice] = useState<DeviceAssignment | null>(null);

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchSearch =
        d.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchManufacturer = manufacturerFilter === 'all' || d.manufacturer === manufacturerFilter;
      return matchSearch && matchManufacturer;
    });
  }, [devices, searchQuery, manufacturerFilter]);

  const stats = useMemo(() => {
    const byManufacturer = MANUFACTURERS.map(m => ({
      ...m,
      count: devices.filter(d => d.manufacturer === m.id).length,
    }));
    const avgUsage = Math.round(devices.reduce((s, d) => s + d.metrics.usageHours, 0) / devices.length * 10) / 10;
    const avgIah = Math.round(devices.reduce((s, d) => s + d.metrics.iah, 0) / devices.length * 10) / 10;
    return { byManufacturer, avgUsage, avgIah, total: devices.length };
  }, [devices]);

  // Chart data for unified dashboard
  const chartData = useMemo(() => {
    return devices.map(d => ({
      name: d.patientName.split(' ')[1] || d.patientName,
      heures: d.metrics.usageHours,
      iah: d.metrics.iah,
      fuites: d.metrics.leakRate,
      pression: d.metrics.pressureAvg,
      fabricant: MANUFACTURERS.find(m => m.id === d.manufacturer)?.name || d.manufacturer,
    }));
  }, [devices]);

  const getManufacturerConfig = (id: Manufacturer) =>
    MANUFACTURERS.find(m => m.id === id) || MANUFACTURERS[0];

  const ConnectionIcon = ({ type }: { type: ConnectionType }) => {
    switch (type) {
      case 'wifi': return <Wifi className="w-3.5 h-3.5" />;
      case 'bluetooth': return <Bluetooth className="w-3.5 h-3.5" />;
      case 'sd_card': return <HardDrive className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Monitor className="w-6 h-6 text-primary" />
          Multi-marques PPC
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dashboard unifie ResMed, Philips Respironics, Lowenstein
        </p>
      </div>

      {/* KPI par fabricant */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total appareils</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        {stats.byManufacturer.map(m => (
          <div key={m.id} className={`${m.bgColor} ${m.borderColor} border rounded-xl p-4`}>
            <p className={`text-sm ${m.color}`}>{m.name}</p>
            <p className={`text-2xl font-bold ${m.color} mt-1`}>{m.count}</p>
          </div>
        ))}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700">Moy. utilisation</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.avgUsage}h</p>
        </div>
      </div>

      {/* Dashboard unifie - graphique */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-4">Comparaison unifiee tous fabricants</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="heures" name="Heures/nuit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="iah" name="IAH" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fuites" name="Fuites" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher patient, appareil, modele..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setManufacturerFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              manufacturerFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            Tous
          </button>
          {MANUFACTURERS.map(m => (
            <button
              key={m.id}
              onClick={() => setManufacturerFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                manufacturerFilter === m.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Liste appareils */}
      <div className="space-y-3">
        {filteredDevices.map(device => {
          const mfr = getManufacturerConfig(device.manufacturer);
          const isOpen = selectedDevice?.id === device.id;

          return (
            <div key={device.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                onClick={() => setSelectedDevice(isOpen ? null : device)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${mfr.bgColor} ${mfr.color} ${mfr.borderColor} border`}>
                    {mfr.name}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{device.patientName}</p>
                    <p className="text-xs text-muted-foreground">{device.model} - {device.serialNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-4 text-sm">
                    <span className={`font-medium ${device.metrics.usageHours >= 4 ? 'text-green-700' : 'text-red-700'}`}>
                      {device.metrics.usageHours}h
                    </span>
                    <span className={`font-medium ${device.metrics.iah <= 5 ? 'text-green-700' : 'text-orange-700'}`}>
                      IAH {device.metrics.iah}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ConnectionIcon type={device.connectionType} />
                    {device.connectionType}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    device.status === 'active' ? 'bg-green-100 text-green-800' :
                    device.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {device.status === 'active' && <CheckCircle className="w-3 h-3" />}
                    {device.status === 'maintenance' && <AlertTriangle className="w-3 h-3" />}
                    {device.status === 'active' ? 'Actif' : device.status === 'maintenance' ? 'Maintenance' : 'Inactif'}
                  </span>
                </div>
              </div>

              {/* Detail selon fabricant */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-4">
                      {/* Info appareil */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Fabricant</p>
                          <p className={`font-medium ${mfr.color}`}>{mfr.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Modele</p>
                          <p className="font-medium">{device.model}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Firmware</p>
                          <p className="font-medium font-mono">{device.firmwareVersion}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Derniere sync</p>
                          <p className="font-medium">{new Date(device.lastSync).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>

                      {/* Metriques adaptees au fabricant */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                          Metriques {mfr.name}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {mfr.metrics.map(metric => {
                            const value = (device.metrics as any)[metric.key];
                            if (value == null) return null;

                            let colorClass = 'text-foreground';
                            if (metric.key === 'usageHours') colorClass = value >= 4 ? 'text-green-700' : 'text-red-700';
                            if (metric.key === 'iah') colorClass = value <= 5 ? 'text-green-700' : value <= 10 ? 'text-orange-700' : 'text-red-700';
                            if (metric.key === 'leakRate') {
                              if (device.manufacturer === 'philips') {
                                colorClass = value <= 10 ? 'text-green-700' : 'text-red-700';
                              } else {
                                colorClass = value <= 24 ? 'text-green-700' : 'text-red-700';
                              }
                            }

                            return (
                              <div key={metric.key} className={`${mfr.bgColor} ${mfr.borderColor} border rounded-lg p-3`}>
                                <p className="text-xs text-muted-foreground">{metric.label}</p>
                                <p className={`text-lg font-bold ${colorClass}`}>
                                  {value}{metric.unit}
                                </p>
                                <p className="text-xs text-muted-foreground">{metric.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Configuration appareil</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Connexion</p>
                            <p className="font-medium flex items-center gap-1">
                              <ConnectionIcon type={device.connectionType} />
                              {device.connectionType === 'wifi' ? 'Wi-Fi' :
                               device.connectionType === 'cellular' ? 'Cellulaire' :
                               device.connectionType === 'bluetooth' ? 'Bluetooth' : 'Carte SD'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pression moy.</p>
                            <p className="font-medium">{device.metrics.pressureAvg} cmH2O</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pression P95</p>
                            <p className="font-medium">{device.metrics.pressureP95} cmH2O</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">N/S</p>
                            <p className="font-medium font-mono text-xs">{device.serialNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
