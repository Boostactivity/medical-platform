import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor, Search, Filter, AlertTriangle, Package, ChevronDown, ChevronRight,
  Clock, User, MapPin, Wrench, Box, RefreshCw, X, Calendar, Hash
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// Types
type MachineStatus = 'en_stock' | 'installe' | 'a_retourner' | 'en_panne';

interface MachineHistory {
  id: string;
  patientName: string;
  patientId: string;
  dateInstallation: string;
  dateRetrait: string | null;
  technicianName: string;
  notes: string;
}

interface Machine {
  id: string;
  model: string;
  serialNumber: string;
  status: MachineStatus;
  dateAchat: string;
  dateInstallation: string | null;
  patientName: string | null;
  patientId: string | null;
  technicianName: string | null;
  technicianId: string | null;
  location: string | null;
  signaled: boolean;
  history: MachineHistory[];
}

interface StockItem {
  id: string;
  type: 'filtre' | 'masque' | 'tuyau' | 'humidificateur';
  label: string;
  quantity: number;
  seuilAlerte: number;
}

// Mock data
const MOCK_MACHINES: Machine[] = [
  {
    id: 'm1', model: 'ResMed AirSense 11', serialNumber: 'RS11-2023-00142',
    status: 'installe', dateAchat: '2022-06-15', dateInstallation: '2022-07-01',
    patientName: 'Jean Dupont', patientId: 'p1', technicianName: 'Marc Lefebvre',
    technicianId: 't1', location: 'Paris 15e', signaled: false,
    history: [
      { id: 'h1', patientName: 'Jean Dupont', patientId: 'p1', dateInstallation: '2022-07-01', dateRetrait: null, technicianName: 'Marc Lefebvre', notes: 'Installation initiale, formation patient effectuee' },
    ]
  },
  {
    id: 'm2', model: 'Philips DreamStation 2', serialNumber: 'PDS2-2021-00089',
    status: 'en_panne', dateAchat: '2021-03-20', dateInstallation: '2021-04-10',
    patientName: 'Marie Martin', patientId: 'p2', technicianName: 'Sophie Morel',
    technicianId: 't2', location: 'Lyon 3e', signaled: true,
    history: [
      { id: 'h2', patientName: 'Pierre Bernard', patientId: 'p3', dateInstallation: '2021-04-10', dateRetrait: '2023-01-15', technicianName: 'Sophie Morel', notes: 'Premiere installation' },
      { id: 'h3', patientName: 'Marie Martin', patientId: 'p2', dateInstallation: '2023-02-01', dateRetrait: null, technicianName: 'Sophie Morel', notes: 'Reinstallation apres revision' },
    ]
  },
  {
    id: 'm3', model: 'ResMed AirSense 10', serialNumber: 'RS10-2020-00331',
    status: 'a_retourner', dateAchat: '2020-01-10', dateInstallation: '2020-02-15',
    patientName: 'Paul Durand', patientId: 'p4', technicianName: 'Marc Lefebvre',
    technicianId: 't1', location: 'Paris 11e', signaled: true,
    history: [
      { id: 'h4', patientName: 'Paul Durand', patientId: 'p4', dateInstallation: '2020-02-15', dateRetrait: null, technicianName: 'Marc Lefebvre', notes: 'Machine ancienne, a remplacer' },
    ]
  },
  {
    id: 'm4', model: 'Lowenstein Prisma Smart', serialNumber: 'LPS-2024-00015',
    status: 'en_stock', dateAchat: '2024-01-05', dateInstallation: null,
    patientName: null, patientId: null, technicianName: null,
    technicianId: null, location: null, signaled: false, history: []
  },
  {
    id: 'm5', model: 'ResMed AirSense 11', serialNumber: 'RS11-2024-00201',
    status: 'en_stock', dateAchat: '2024-02-20', dateInstallation: null,
    patientName: null, patientId: null, technicianName: null,
    technicianId: null, location: null, signaled: false, history: []
  },
  {
    id: 'm6', model: 'Philips DreamStation 2', serialNumber: 'PDS2-2023-00156',
    status: 'installe', dateAchat: '2023-05-10', dateInstallation: '2023-06-01',
    patientName: 'Claire Petit', patientId: 'p5', technicianName: 'Sophie Morel',
    technicianId: 't2', location: 'Villeurbanne', signaled: false,
    history: [
      { id: 'h5', patientName: 'Claire Petit', patientId: 'p5', dateInstallation: '2023-06-01', dateRetrait: null, technicianName: 'Sophie Morel', notes: 'Installation standard' },
    ]
  },
];

const MOCK_STOCK: StockItem[] = [
  { id: 's1', type: 'filtre', label: 'Filtres standards', quantity: 245, seuilAlerte: 50 },
  { id: 's2', type: 'masque', label: 'Masques nasaux (toutes tailles)', quantity: 38, seuilAlerte: 20 },
  { id: 's3', type: 'tuyau', label: 'Tuyaux chauffants 1.8m', quantity: 62, seuilAlerte: 15 },
  { id: 's4', type: 'humidificateur', label: 'Reservoirs humidificateur', quantity: 12, seuilAlerte: 10 },
];

const STATUS_CONFIG: Record<MachineStatus, { label: string; color: string; bg: string }> = {
  en_stock: { label: 'En stock', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  installe: { label: 'Installe', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  a_retourner: { label: 'A retourner', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  en_panne: { label: 'En panne', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const TECHNICIANS = ['Marc Lefebvre', 'Sophie Morel'];

function isOlderThan3Years(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365) > 3;
}

export function FleetManagement() {
  const [machines, setMachines] = useState<Machine[]>(MOCK_MACHINES);
  const [stock, setStock] = useState<StockItem[]>(MOCK_STOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>('all');

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .order('date_achat', { ascending: false });
        if (!error && data?.length) {
          const mapped: Machine[] = data.map((d: any) => ({
            id: d.id,
            model: d.model || '',
            serialNumber: d.serial_number || '',
            status: d.status || 'en_stock',
            dateAchat: d.date_achat || '',
            dateInstallation: d.date_installation,
            patientName: d.patient_name,
            patientId: d.patient_id,
            technicianName: d.technician_name,
            technicianId: d.technician_id,
            location: d.location,
            signaled: d.signaled ?? false,
            history: d.history || [],
          }));
          setMachines(mapped);
        }
      } catch (e) {
        console.warn('FleetManagement: Using mock data', e);
      }
    };
    fetchDevices();
  }, []);
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const alertMachines = useMemo(() =>
    machines.filter(m => m.signaled || isOlderThan3Years(m.dateAchat)),
    [machines]
  );

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (techFilter !== 'all' && m.technicianName !== techFilter) return false;
      if (dateFilter && m.dateInstallation && m.dateInstallation < dateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.model.toLowerCase().includes(q) ||
          m.serialNumber.toLowerCase().includes(q) ||
          (m.patientName && m.patientName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [machines, statusFilter, techFilter, dateFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<MachineStatus, number> = { en_stock: 0, installe: 0, a_retourner: 0, en_panne: 0 };
    machines.forEach(m => counts[m.status]++);
    return counts;
  }, [machines]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Gestion du parc machines</h1>
          <p className="text-[#86868B] mt-1">{machines.length} machines au total</p>
        </div>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all">
          <Package className="w-5 h-5" />
          Ajouter une machine
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [MachineStatus, typeof STATUS_CONFIG[MachineStatus]][]).map(([key, config]) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={`p-5 rounded-2xl border-2 transition-all text-left ${
              statusFilter === key ? config.bg + ' border-current' : 'bg-white border-[#E5E5EA] hover:border-[#D1D1D6]'
            }`}
          >
            <div className={`text-3xl font-bold ${config.color}`}>{statusCounts[key]}</div>
            <div className="text-sm text-[#86868B] mt-1">{config.label}</div>
          </motion.button>
        ))}
      </div>

      {/* Alerts */}
      {alertMachines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">{alertMachines.length} machine(s) a remplacer</h3>
          </div>
          <div className="space-y-2">
            {alertMachines.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                <div>
                  <span className="font-medium text-[#1D1D1F]">{m.model}</span>
                  <span className="text-[#86868B] ml-2 text-sm">{m.serialNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  {m.signaled && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Signalee</span>}
                  {isOlderThan3Years(m.dateAchat) && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{'>'} 3 ans</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Counters */}
      <div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-4">Stock consommables</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stock.map(item => {
            const isLow = item.quantity <= item.seuilAlerte;
            return (
              <div key={item.id} className={`p-5 rounded-2xl border ${isLow ? 'bg-red-50 border-red-200' : 'bg-[#F5F5F7] border-[#E5E5EA]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <Box className={`w-5 h-5 ${isLow ? 'text-red-500' : 'text-[#86868B]'}`} />
                  {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>
                <div className={`text-2xl font-bold ${isLow ? 'text-red-700' : 'text-[#1D1D1F]'}`}>{item.quantity}</div>
                <div className="text-sm text-[#86868B] mt-1">{item.label}</div>
                {isLow && <div className="text-xs text-red-600 mt-1">Seuil: {item.seuilAlerte}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par modele, numero de serie, patient..."
              className="w-full pl-12 pr-4 py-3 bg-[#F5F5F7] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
              showFilters ? 'bg-[#3b82f6] text-white border-[#3b82f6]' : 'bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5EA] hover:border-[#D1D1D6]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtres
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E5E5EA]">
                <div>
                  <label className="text-sm text-[#86868B] mb-1 block">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as MachineStatus | 'all')}
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#86868B] mb-1 block">Technicien</label>
                  <select
                    value={techFilter}
                    onChange={(e) => setTechFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none"
                  >
                    <option value="all">Tous les techniciens</option>
                    {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#86868B] mb-1 block">Installation apres le</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none"
                  />
                </div>
              </div>
              {(statusFilter !== 'all' || techFilter !== 'all' || dateFilter) && (
                <button
                  onClick={() => { setStatusFilter('all'); setTechFilter('all'); setDateFilter(''); }}
                  className="mt-3 text-sm text-[#3b82f6] hover:underline flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Reinitialiser les filtres
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Machine List */}
      <div className="space-y-3">
        {filteredMachines.map(machine => {
          const isExpanded = expandedMachine === machine.id;
          const needsReplacement = machine.signaled || isOlderThan3Years(machine.dateAchat);
          const cfg = STATUS_CONFIG[machine.status];

          return (
            <motion.div
              key={machine.id}
              layout
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                needsReplacement ? 'border-amber-300' : 'border-[#E5E5EA]'
              }`}
            >
              <button
                onClick={() => setExpandedMachine(isExpanded ? null : machine.id)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-[#F5F5F7]/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  machine.status === 'en_panne' ? 'bg-red-100' :
                  machine.status === 'a_retourner' ? 'bg-orange-100' :
                  machine.status === 'installe' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  <Monitor className={`w-6 h-6 ${cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1D1D1F]">{machine.model}</span>
                    {needsReplacement && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#86868B] mt-1">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{machine.serialNumber}</span>
                    {machine.patientName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{machine.patientName}</span>}
                  </div>
                </div>

                <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>

                {isExpanded ? <ChevronDown className="w-5 h-5 text-[#86868B]" /> : <ChevronRight className="w-5 h-5 text-[#86868B]" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t border-[#E5E5EA]">
                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                        <div>
                          <div className="text-xs text-[#86868B]">Date d'achat</div>
                          <div className="text-sm font-medium text-[#1D1D1F] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />{machine.dateAchat}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#86868B]">Date installation</div>
                          <div className="text-sm font-medium text-[#1D1D1F]">{machine.dateInstallation || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#86868B]">Technicien</div>
                          <div className="text-sm font-medium text-[#1D1D1F] flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5" />{machine.technicianName || '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#86868B]">Localisation</div>
                          <div className="text-sm font-medium text-[#1D1D1F] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />{machine.location || '-'}
                          </div>
                        </div>
                      </div>

                      {/* History */}
                      <div>
                        <h4 className="text-sm font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Historique de la machine
                        </h4>
                        {machine.history.length === 0 ? (
                          <p className="text-sm text-[#86868B] italic">Aucun historique - machine en stock</p>
                        ) : (
                          <div className="space-y-2">
                            {machine.history.map((h, i) => (
                              <div key={h.id} className="relative pl-6 pb-3">
                                <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white shadow" />
                                {i < machine.history.length - 1 && <div className="absolute left-[5px] top-5 bottom-0 w-0.5 bg-[#E5E5EA]" />}
                                <div className="bg-[#F5F5F7] rounded-xl p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-[#1D1D1F]">{h.patientName}</span>
                                    <span className="text-xs text-[#86868B]">{h.dateInstallation} → {h.dateRetrait || 'En cours'}</span>
                                  </div>
                                  <p className="text-xs text-[#86868B] mt-1">{h.notes}</p>
                                  <p className="text-xs text-[#86868B]">Technicien: {h.technicianName}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button className="px-4 py-2 text-sm bg-[#F5F5F7] rounded-full hover:bg-[#E5E5EA] transition-colors flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4" /> Changer statut
                        </button>
                        {needsReplacement && (
                          <button className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Planifier remplacement
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredMachines.length === 0 && (
          <div className="text-center py-12 text-[#86868B]">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucune machine trouvee avec ces criteres</p>
          </div>
        )}
      </div>
    </div>
  );
}
