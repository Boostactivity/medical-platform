import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ticket, Plus, Clock, CheckCircle, AlertCircle, User, ChevronDown, ChevronRight,
  ArrowRight, Filter, Search, X, Wrench, MessageSquare, Calendar, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// Types
type TicketStatus = 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
type TicketType = 'panne' | 'gene' | 'remplacement' | 'autre';
type TicketPriority = 'basse' | 'normale' | 'haute' | 'urgente';

interface TicketAction {
  id: string;
  date: string;
  author: string;
  action: string;
  details: string;
}

interface SupportTicket {
  id: string;
  reference: string;
  patientName: string;
  patientId: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  technicianName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  slaResponseDeadline: string;
  slaResolutionDeadline: string;
  timeline: TicketAction[];
}

// Config
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  ouvert: { label: 'Ouvert', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: AlertCircle },
  en_cours: { label: 'En cours', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  resolu: { label: 'Resolu', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
  ferme: { label: 'Ferme', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: CheckCircle },
};

const TYPE_CONFIG: Record<TicketType, { label: string; color: string }> = {
  panne: { label: 'Panne', color: 'text-red-700 bg-red-50' },
  gene: { label: 'Gene', color: 'text-amber-700 bg-amber-50' },
  remplacement: { label: 'Remplacement', color: 'text-blue-700 bg-blue-50' },
  autre: { label: 'Autre', color: 'text-gray-700 bg-gray-50' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  basse: { label: 'Basse', color: 'text-gray-600 bg-gray-100' },
  normale: { label: 'Normale', color: 'text-blue-600 bg-blue-100' },
  haute: { label: 'Haute', color: 'text-orange-600 bg-orange-100' },
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-100' },
};

const TECHNICIANS = [
  { id: 't1', name: 'Marc Lefebvre', zone: 'Paris', activeTickets: 3 },
  { id: 't2', name: 'Sophie Morel', zone: 'Lyon', activeTickets: 1 },
  { id: 't3', name: 'Luc Garnier', zone: 'Paris', activeTickets: 5 },
];

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'tk1', reference: 'SAV-2024-001', patientName: 'Jean Dupont', patientId: 'p1',
    type: 'panne', priority: 'haute', status: 'en_cours',
    description: 'Machine PPC arretee en pleine nuit, ecran noir. Patient inquiet.',
    technicianName: 'Marc Lefebvre', createdAt: '2024-03-20T08:30:00', updatedAt: '2024-03-20T10:15:00',
    resolvedAt: null, slaResponseDeadline: '2024-03-20T12:30:00', slaResolutionDeadline: '2024-03-21T08:30:00',
    timeline: [
      { id: 'a1', date: '2024-03-20T08:30:00', author: 'Systeme', action: 'Ticket cree', details: 'Ticket cree automatiquement suite appel patient' },
      { id: 'a2', date: '2024-03-20T09:00:00', author: 'Systeme', action: 'Assignation auto', details: 'Assigne a Marc Lefebvre (le moins charge, zone Paris)' },
      { id: 'a3', date: '2024-03-20T10:15:00', author: 'Marc Lefebvre', action: 'Prise en charge', details: 'Intervention planifiee pour 14h aujourd\'hui. Machine de remplacement preparee.' },
    ]
  },
  {
    id: 'tk2', reference: 'SAV-2024-002', patientName: 'Marie Martin', patientId: 'p2',
    type: 'gene', priority: 'normale', status: 'ouvert',
    description: 'Le masque provoque des irritations au niveau du nez. Patiente demande un changement de type de masque.',
    technicianName: null, createdAt: '2024-03-20T11:00:00', updatedAt: '2024-03-20T11:00:00',
    resolvedAt: null, slaResponseDeadline: '2024-03-21T11:00:00', slaResolutionDeadline: '2024-03-23T11:00:00',
    timeline: [
      { id: 'a4', date: '2024-03-20T11:00:00', author: 'Dr. Laurent', action: 'Ticket cree', details: 'Cree par le medecin prescripteur suite a consultation' },
    ]
  },
  {
    id: 'tk3', reference: 'SAV-2024-003', patientName: 'Paul Durand', patientId: 'p4',
    type: 'remplacement', priority: 'basse', status: 'resolu',
    description: 'Machine de plus de 3 ans, remplacement prevu dans le cadre du renouvellement annuel.',
    technicianName: 'Sophie Morel', createdAt: '2024-03-18T14:00:00', updatedAt: '2024-03-19T16:30:00',
    resolvedAt: '2024-03-19T16:30:00', slaResponseDeadline: '2024-03-19T14:00:00', slaResolutionDeadline: '2024-03-25T14:00:00',
    timeline: [
      { id: 'a5', date: '2024-03-18T14:00:00', author: 'Systeme', action: 'Ticket cree', details: 'Cree automatiquement par alerte machine > 3 ans' },
      { id: 'a6', date: '2024-03-18T15:00:00', author: 'Systeme', action: 'Assignation auto', details: 'Assigne a Sophie Morel' },
      { id: 'a7', date: '2024-03-19T09:00:00', author: 'Sophie Morel', action: 'Intervention effectuee', details: 'Remplacement de la machine RS10 par RS11. Patient forme.' },
      { id: 'a8', date: '2024-03-19T16:30:00', author: 'Sophie Morel', action: 'Ticket resolu', details: 'Nouvelle machine installee, fonctionnement OK.' },
    ]
  },
  {
    id: 'tk4', reference: 'SAV-2024-004', patientName: 'Claire Petit', patientId: 'p5',
    type: 'autre', priority: 'normale', status: 'ferme',
    description: 'Demande de formation complementaire a l\'utilisation de la machine.',
    technicianName: 'Marc Lefebvre', createdAt: '2024-03-15T10:00:00', updatedAt: '2024-03-17T11:00:00',
    resolvedAt: '2024-03-16T14:00:00', slaResponseDeadline: '2024-03-16T10:00:00', slaResolutionDeadline: '2024-03-22T10:00:00',
    timeline: [
      { id: 'a9', date: '2024-03-15T10:00:00', author: 'Claire Petit', action: 'Ticket cree', details: 'Via portail patient' },
      { id: 'a10', date: '2024-03-16T14:00:00', author: 'Marc Lefebvre', action: 'Formation effectuee', details: 'Formation video + rappel telephonique' },
      { id: 'a11', date: '2024-03-17T11:00:00', author: 'Marc Lefebvre', action: 'Ticket ferme', details: 'Patiente satisfaite, pas de suivi necessaire' },
    ]
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isSlaBreached(deadline: string): boolean {
  return new Date() > new Date(deadline);
}

export function TicketSystem() {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ patientName: '', type: 'panne' as TicketType, priority: 'normale' as TicketPriority, description: '' });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data?.length) {
          const mapped: SupportTicket[] = data.map((t: any) => ({
            id: t.id,
            reference: t.reference || t.id,
            patientName: t.patient_name || '',
            patientId: t.patient_id || '',
            type: t.type || 'autre',
            priority: t.priority || 'normale',
            status: t.status || 'ouvert',
            description: t.description || '',
            technicianName: t.technician_name,
            createdAt: t.created_at,
            updatedAt: t.updated_at || t.created_at,
            resolvedAt: t.resolved_at,
            slaResponseDeadline: t.sla_response_deadline || '',
            slaResolutionDeadline: t.sla_resolution_deadline || '',
            timeline: t.timeline || [],
          }));
          setTickets(mapped);
        }
      } catch (e) {
        console.warn('TicketSystem: Using mock data', e);
      }
    };
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.reference.toLowerCase().includes(q) || t.patientName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, statusFilter, searchQuery]);

  const dashboardStats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      ouverts: tickets.filter(t => t.status === 'ouvert').length,
      enRetard: tickets.filter(t => (t.status === 'ouvert' || t.status === 'en_cours') && isSlaBreached(t.slaResolutionDeadline)).length,
      resolusAujourdhui: tickets.filter(t => t.resolvedAt && new Date(t.resolvedAt).toDateString() === today).length,
      enCours: tickets.filter(t => t.status === 'en_cours').length,
    };
  }, [tickets]);

  const handleCreateTicket = () => {
    if (!newTicket.patientName.trim() || !newTicket.description.trim()) return;
    // Auto-assign to least busy technician
    const leastBusy = [...TECHNICIANS].sort((a, b) => a.activeTickets - b.activeTickets)[0];
    const now = new Date().toISOString();
    const responseDeadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const resolutionDeadline = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const ticket: SupportTicket = {
      id: `tk${tickets.length + 1}`,
      reference: `SAV-2024-${String(tickets.length + 1).padStart(3, '0')}`,
      patientName: newTicket.patientName,
      patientId: `p_new_${tickets.length + 1}`,
      type: newTicket.type,
      priority: newTicket.priority,
      status: 'ouvert',
      description: newTicket.description,
      technicianName: leastBusy.name,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      slaResponseDeadline: responseDeadline,
      slaResolutionDeadline: resolutionDeadline,
      timeline: [
        { id: `a_new_1`, date: now, author: 'Systeme', action: 'Ticket cree', details: 'Nouveau ticket SAV' },
        { id: `a_new_2`, date: now, author: 'Systeme', action: 'Assignation auto', details: `Assigne a ${leastBusy.name} (le moins charge, zone ${leastBusy.zone})` },
      ],
    };
    setTickets([ticket, ...tickets]);
    setNewTicket({ patientName: '', type: 'panne', priority: 'normale', description: '' });
    setShowCreateModal(false);
  };

  const advanceStatus = (ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const nextStatus: Record<string, TicketStatus> = { ouvert: 'en_cours', en_cours: 'resolu', resolu: 'ferme' };
      const next = nextStatus[t.status];
      if (!next) return t;
      const now = new Date().toISOString();
      return {
        ...t,
        status: next,
        updatedAt: now,
        resolvedAt: next === 'resolu' ? now : t.resolvedAt,
        timeline: [...t.timeline, {
          id: `a_adv_${Date.now()}`,
          date: now,
          author: t.technicianName || 'Systeme',
          action: `Statut passe a "${STATUS_CONFIG[next].label}"`,
          details: '',
        }],
      };
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Tickets SAV</h1>
          <p className="text-[#86868B] mt-1">{tickets.length} tickets au total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouveau ticket
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{dashboardStats.ouverts}</div>
          <div className="text-sm text-[#86868B] mt-1">Ouverts</div>
        </div>
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-3xl font-bold text-amber-700">{dashboardStats.enCours}</div>
          <div className="text-sm text-[#86868B] mt-1">En cours</div>
        </div>
        <div className={`p-5 rounded-2xl ${dashboardStats.enRetard > 0 ? 'bg-red-50 border border-red-200' : 'bg-[#F5F5F7] border border-[#E5E5EA]'}`}>
          <div className={`text-3xl font-bold ${dashboardStats.enRetard > 0 ? 'text-red-700' : 'text-[#1D1D1F]'}`}>{dashboardStats.enRetard}</div>
          <div className="text-sm text-[#86868B] mt-1">En retard (SLA)</div>
        </div>
        <div className="p-5 rounded-2xl bg-green-50 border border-green-200">
          <div className="text-3xl font-bold text-green-700">{dashboardStats.resolusAujourdhui}</div>
          <div className="text-sm text-[#86868B] mt-1">Resolus aujourd'hui</div>
        </div>
      </div>

      {/* SLA Info */}
      <div className="bg-[#F5F5F7] rounded-2xl p-5 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#3b82f6]" />
          <span className="text-sm text-[#1D1D1F]"><strong>SLA Reponse:</strong> 24h (urgente: 4h)</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#8b5cf6]" />
          <span className="text-sm text-[#1D1D1F]"><strong>SLA Resolution:</strong> 72h (urgente: 24h)</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par reference, patient, description..."
            className="w-full pl-12 pr-4 py-3 bg-[#F5F5F7] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3b82f6] outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...Object.keys(STATUS_CONFIG)] as (TicketStatus | 'all')[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.map(ticket => {
          const isExpanded = expandedTicket === ticket.id;
          const cfg = STATUS_CONFIG[ticket.status];
          const Icon = cfg.icon;
          const slaBreached = (ticket.status === 'ouvert' || ticket.status === 'en_cours') && isSlaBreached(ticket.slaResolutionDeadline);

          return (
            <motion.div key={ticket.id} layout className={`bg-white rounded-2xl border overflow-hidden ${slaBreached ? 'border-red-300' : 'border-[#E5E5EA]'}`}>
              <button
                onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-[#F5F5F7]/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-[#86868B]">{ticket.reference}</span>
                    <span className="font-semibold text-[#1D1D1F]">{ticket.patientName}</span>
                    {slaBreached && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />SLA depasse</span>}
                  </div>
                  <p className="text-sm text-[#86868B] truncate mt-0.5">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CONFIG[ticket.type].color}`}>{TYPE_CONFIG[ticket.type].label}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[ticket.priority].color}`}>{PRIORITY_CONFIG[ticket.priority].label}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-[#86868B]" /> : <ChevronRight className="w-5 h-5 text-[#86868B]" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-5 space-y-4 border-t border-[#E5E5EA]">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                        <div><div className="text-xs text-[#86868B]">Cree le</div><div className="text-sm font-medium">{formatDate(ticket.createdAt)}</div></div>
                        <div><div className="text-xs text-[#86868B]">Technicien</div><div className="text-sm font-medium flex items-center gap-1"><User className="w-3.5 h-3.5" />{ticket.technicianName || 'Non assigne'}</div></div>
                        <div><div className="text-xs text-[#86868B]">SLA Reponse</div><div className={`text-sm font-medium ${isSlaBreached(ticket.slaResponseDeadline) && ticket.status === 'ouvert' ? 'text-red-600' : ''}`}>{formatDate(ticket.slaResponseDeadline)}</div></div>
                        <div><div className="text-xs text-[#86868B]">SLA Resolution</div><div className={`text-sm font-medium ${slaBreached ? 'text-red-600' : ''}`}>{formatDate(ticket.slaResolutionDeadline)}</div></div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <h4 className="text-sm font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Timeline</h4>
                        <div className="space-y-2">
                          {ticket.timeline.map((a, i) => (
                            <div key={a.id} className="relative pl-6 pb-2">
                              <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-[#8b5cf6] border-2 border-white shadow" />
                              {i < ticket.timeline.length - 1 && <div className="absolute left-[5px] top-5 bottom-0 w-0.5 bg-[#E5E5EA]" />}
                              <div className="bg-[#F5F5F7] rounded-xl p-3">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <span className="text-sm font-medium text-[#1D1D1F]">{a.action}</span>
                                  <span className="text-xs text-[#86868B]">{formatDate(a.date)}</span>
                                </div>
                                <p className="text-xs text-[#86868B] mt-0.5">{a.author} — {a.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      {ticket.status !== 'ferme' && (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => advanceStatus(ticket.id)}
                            className="px-5 py-2.5 text-sm bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Passer a "{STATUS_CONFIG[({ ouvert: 'en_cours', en_cours: 'resolu', resolu: 'ferme' } as Record<string, TicketStatus>)[ticket.status]]?.label}"
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#1D1D1F]">Nouveau ticket</h2>
                  <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F7]"><X className="w-6 h-6 text-[#86868B]" /></button>
                </div>
                <div className="p-8 space-y-5">
                  <div>
                    <label className="block text-[#1D1D1F] mb-2">Patient</label>
                    <input type="text" value={newTicket.patientName} onChange={e => setNewTicket({ ...newTicket, patientName: e.target.value })} className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl focus:ring-2 focus:ring-[#3b82f6] outline-none" placeholder="Nom du patient" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#1D1D1F] mb-2">Type</label>
                      <select value={newTicket.type} onChange={e => setNewTicket({ ...newTicket, type: e.target.value as TicketType })} className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none">
                        {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#1D1D1F] mb-2">Priorite</label>
                      <select value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as TicketPriority })} className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none">
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#1D1D1F] mb-2">Description</label>
                    <textarea value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} rows={4} className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl focus:ring-2 focus:ring-[#3b82f6] outline-none resize-none" placeholder="Decrivez le probleme..." />
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                    <strong>Assignation automatique:</strong> le ticket sera assigne au technicien le moins charge de la zone du patient.
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-4 bg-[#F5F5F7] text-[#1D1D1F] rounded-full hover:bg-[#E5E5EA] transition-all">Annuler</button>
                    <button onClick={handleCreateTicket} className="flex-1 px-6 py-4 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      <Ticket className="w-5 h-5" /> Creer le ticket
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
