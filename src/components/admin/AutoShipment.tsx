import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Send, Clock, CheckCircle, AlertTriangle, Calendar, User,
  ChevronDown, ChevronRight, Search, Filter, Truck, Box
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// Types
type ConsumableType = 'masque' | 'filtre' | 'tuyau' | 'humidificateur';

interface ConsumableRule {
  type: ConsumableType;
  label: string;
  intervalDays: number;
  alertDaysBefore: number;
}

interface PatientConsumable {
  id: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  type: ConsumableType;
  lastSentDate: string;
  nextDueDate: string;
  status: 'ok' | 'alerte' | 'expire';
}

interface Shipment {
  id: string;
  patientId: string;
  patientName: string;
  type: ConsumableType;
  date: string;
  status: 'planifie' | 'envoye' | 'livre';
  trackingNumber: string | null;
}

// Rules
const RULES: ConsumableRule[] = [
  { type: 'masque', label: 'Masque', intervalDays: 90, alertDaysBefore: 10 },
  { type: 'filtre', label: 'Filtre', intervalDays: 180, alertDaysBefore: 10 },
  { type: 'tuyau', label: 'Tuyau', intervalDays: 365, alertDaysBefore: 10 },
  { type: 'humidificateur', label: 'Reservoir humidificateur', intervalDays: 365, alertDaysBefore: 10 },
];

const TYPE_ICONS: Record<ConsumableType, string> = {
  masque: '😷',
  filtre: '🔲',
  tuyau: '🔧',
  humidificateur: '💧',
};

// Mock data
const TODAY = new Date();
function daysFromNow(days: number) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function daysAgo(days: number) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const MOCK_CONSUMABLES: PatientConsumable[] = [
  { id: 'c1', patientId: 'p1', patientName: 'Jean Dupont', patientAddress: '12 rue de Paris, 75015', type: 'masque', lastSentDate: daysAgo(83), nextDueDate: daysFromNow(7), status: 'alerte' },
  { id: 'c2', patientId: 'p1', patientName: 'Jean Dupont', patientAddress: '12 rue de Paris, 75015', type: 'filtre', lastSentDate: daysAgo(170), nextDueDate: daysFromNow(10), status: 'alerte' },
  { id: 'c3', patientId: 'p2', patientName: 'Marie Martin', patientAddress: '45 avenue Foch, 69003', type: 'masque', lastSentDate: daysAgo(95), nextDueDate: daysFromNow(-5), status: 'expire' },
  { id: 'c4', patientId: 'p2', patientName: 'Marie Martin', patientAddress: '45 avenue Foch, 69003', type: 'tuyau', lastSentDate: daysAgo(300), nextDueDate: daysFromNow(65), status: 'ok' },
  { id: 'c5', patientId: 'p4', patientName: 'Paul Durand', patientAddress: '8 bd Voltaire, 75011', type: 'masque', lastSentDate: daysAgo(50), nextDueDate: daysFromNow(40), status: 'ok' },
  { id: 'c6', patientId: 'p4', patientName: 'Paul Durand', patientAddress: '8 bd Voltaire, 75011', type: 'filtre', lastSentDate: daysAgo(178), nextDueDate: daysFromNow(2), status: 'alerte' },
  { id: 'c7', patientId: 'p5', patientName: 'Claire Petit', patientAddress: '22 rue Garibaldi, 69100', type: 'masque', lastSentDate: daysAgo(92), nextDueDate: daysFromNow(-2), status: 'expire' },
  { id: 'c8', patientId: 'p5', patientName: 'Claire Petit', patientAddress: '22 rue Garibaldi, 69100', type: 'humidificateur', lastSentDate: daysAgo(355), nextDueDate: daysFromNow(10), status: 'alerte' },
];

const MOCK_SHIPMENTS: Shipment[] = [
  { id: 's1', patientId: 'p3', patientName: 'Pierre Bernard', type: 'masque', date: daysAgo(2), status: 'envoye', trackingNumber: 'FR123456789' },
  { id: 's2', patientId: 'p3', patientName: 'Pierre Bernard', type: 'filtre', date: daysAgo(2), status: 'envoye', trackingNumber: 'FR123456790' },
  { id: 's3', patientId: 'p1', patientName: 'Jean Dupont', type: 'tuyau', date: daysAgo(30), status: 'livre', trackingNumber: 'FR987654321' },
  { id: 's4', patientId: 'p2', patientName: 'Marie Martin', type: 'masque', date: daysAgo(95), status: 'livre', trackingNumber: 'FR555666777' },
];

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function AutoShipment() {
  const [consumables, setConsumables] = useState<PatientConsumable[]>(MOCK_CONSUMABLES);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConsumableType | 'all'>('all');
  const [tab, setTab] = useState<'alertes' | 'historique' | 'regles'>('alertes');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch masks and devices for consumable dates
        const [masksRes, devicesRes, ordersRes] = await Promise.all([
          supabase.from('masks').select('*'),
          supabase.from('devices').select('id, patient_id, patient_name, date_installation'),
          supabase.from('orders').select('*').order('date', { ascending: false }),
        ]);
        if (!masksRes.error && masksRes.data?.length) {
          // Use masks data if available
          console.log('AutoShipment: Loaded masks data from Supabase');
        }
        if (!ordersRes.error && ordersRes.data?.length) {
          const mappedShipments: Shipment[] = ordersRes.data.map((o: any) => ({
            id: o.id,
            patientId: o.patient_id || '',
            patientName: o.patient_name || '',
            type: o.type || 'masque',
            date: o.date,
            status: o.status || 'planifie',
            trackingNumber: o.tracking_number,
          }));
          setShipments(mappedShipments);
        }
      } catch (e) {
        console.warn('AutoShipment: Using mock data', e);
      }
    };
    fetchData();
  }, []);

  const alertConsumables = useMemo(() =>
    consumables.filter(c => c.status === 'alerte' || c.status === 'expire')
      .sort((a, b) => daysDiff(a.nextDueDate) - daysDiff(b.nextDueDate)),
    [consumables]
  );

  const filteredConsumables = useMemo(() => {
    let list = tab === 'alertes' ? alertConsumables : consumables;
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.patientName.toLowerCase().includes(q));
    }
    return list;
  }, [consumables, alertConsumables, tab, typeFilter, searchQuery]);

  const dashboardStats = useMemo(() => {
    const today = new Date().toDateString();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return {
      envoisDuJour: shipments.filter(s => new Date(s.date).toDateString() === today).length,
      planifiesCetteSemaine: consumables.filter(c => {
        const d = new Date(c.nextDueDate);
        return d >= new Date() && d <= weekFromNow;
      }).length,
      alertes: alertConsumables.length,
      expires: consumables.filter(c => c.status === 'expire').length,
    };
  }, [shipments, consumables, alertConsumables]);

  const handleSend = (consumableId: string) => {
    const c = consumables.find(x => x.id === consumableId);
    if (!c) return;
    const rule = RULES.find(r => r.type === c.type);
    if (!rule) return;
    const now = new Date();
    const newShipment: Shipment = {
      id: `s_new_${Date.now()}`,
      patientId: c.patientId,
      patientName: c.patientName,
      type: c.type,
      date: now.toISOString().split('T')[0],
      status: 'planifie',
      trackingNumber: null,
    };
    setShipments([newShipment, ...shipments]);
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + rule.intervalDays);
    setConsumables(prev => prev.map(x =>
      x.id === consumableId
        ? { ...x, lastSentDate: now.toISOString().split('T')[0], nextDueDate: nextDue.toISOString().split('T')[0], status: 'ok' as const }
        : x
    ));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Envoi automatique consommables</h1>
        <p className="text-[#86868B] mt-1">Gestion des envois de masques, filtres, tuyaux et humidificateurs</p>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
          <div className="flex items-center gap-2 mb-2"><Truck className="w-5 h-5 text-[#3b82f6]" /></div>
          <div className="text-3xl font-bold text-[#1D1D1F]">{dashboardStats.envoisDuJour}</div>
          <div className="text-sm text-[#86868B]">Envois du jour</div>
        </div>
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-blue-600" /></div>
          <div className="text-3xl font-bold text-blue-700">{dashboardStats.planifiesCetteSemaine}</div>
          <div className="text-sm text-[#86868B]">Planifies cette semaine</div>
        </div>
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div className="text-3xl font-bold text-amber-700">{dashboardStats.alertes}</div>
          <div className="text-sm text-[#86868B]">Alertes J-10</div>
        </div>
        <div className={`p-5 rounded-2xl ${dashboardStats.expires > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2"><Clock className={`w-5 h-5 ${dashboardStats.expires > 0 ? 'text-red-600' : 'text-green-600'}`} /></div>
          <div className={`text-3xl font-bold ${dashboardStats.expires > 0 ? 'text-red-700' : 'text-green-700'}`}>{dashboardStats.expires}</div>
          <div className="text-sm text-[#86868B]">Expires</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E5E5EA] pb-0">
        {([['alertes', 'Alertes & envois'], ['historique', 'Historique envois'], ['regles', 'Regles']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === key ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Alertes */}
      {tab === 'alertes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher un patient..." className="w-full pl-12 pr-4 py-3 bg-[#F5F5F7] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'masque', 'filtre', 'tuyau', 'humidificateur'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${typeFilter === t ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'}`}>
                  {t === 'all' ? 'Tous' : RULES.find(r => r.type === t)?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredConsumables.map(c => {
              const diff = daysDiff(c.nextDueDate);
              const isExpired = diff < 0;
              return (
                <div key={c.id} className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${isExpired ? 'border-red-300' : 'border-amber-200'}`}>
                  <div className="text-3xl">{TYPE_ICONS[c.type]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1D1D1F]">{c.patientName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isExpired ? `Expire depuis ${Math.abs(diff)}j` : `Dans ${diff}j`}
                      </span>
                    </div>
                    <div className="text-sm text-[#86868B] mt-1">
                      {RULES.find(r => r.type === c.type)?.label} - Dernier envoi: {c.lastSentDate}
                    </div>
                    <div className="text-xs text-[#86868B]">{c.patientAddress}</div>
                  </div>
                  <button
                    onClick={() => handleSend(c.id)}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium shrink-0"
                  >
                    <Send className="w-4 h-4" /> Envoyer
                  </button>
                </div>
              );
            })}
            {filteredConsumables.length === 0 && (
              <div className="text-center py-12 text-[#86868B]">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Aucune alerte en cours</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historique */}
      {tab === 'historique' && (
        <div className="space-y-3">
          {shipments.map(s => {
            const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
              planifie: { label: 'Planifie', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              envoye: { label: 'Envoye', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              livre: { label: 'Livre', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            };
            const cfg = statusCfg[s.status];
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-5 flex items-center gap-4">
                <div className="text-2xl">{TYPE_ICONS[s.type]}</div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1D1D1F]">{s.patientName}</div>
                  <div className="text-sm text-[#86868B]">{RULES.find(r => r.type === s.type)?.label} - {s.date}</div>
                  {s.trackingNumber && <div className="text-xs text-[#86868B] font-mono">Suivi: {s.trackingNumber}</div>}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Regles */}
      {tab === 'regles' && (
        <div className="space-y-4">
          <p className="text-[#86868B]">Regles de renouvellement automatique des consommables PPC.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RULES.map(rule => (
              <div key={rule.type} className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{TYPE_ICONS[rule.type]}</span>
                  <div>
                    <h3 className="font-semibold text-[#1D1D1F]">{rule.label}</h3>
                    <p className="text-sm text-[#86868B]">Renouvellement automatique</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-[#F5F5F7] rounded-xl px-4 py-3">
                    <span className="text-sm text-[#86868B]">Intervalle</span>
                    <span className="text-sm font-semibold text-[#1D1D1F]">Tous les {rule.intervalDays} jours</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#F5F5F7] rounded-xl px-4 py-3">
                    <span className="text-sm text-[#86868B]">Alerte avant expiration</span>
                    <span className="text-sm font-semibold text-[#1D1D1F]">J-{rule.alertDaysBefore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
