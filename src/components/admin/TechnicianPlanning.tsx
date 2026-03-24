import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Clock, User, Calendar, ChevronLeft, ChevronRight, Navigation,
  Phone, Wrench, CheckCircle, AlertCircle, Pause
} from 'lucide-react';

// Types
type TechStatus = 'disponible' | 'en_intervention' | 'absent';
type InterventionStatus = 'planifie' | 'en_cours' | 'termine';

interface Intervention {
  id: string;
  patientName: string;
  patientAddress: string;
  patientPhone: string;
  type: string;
  time: string;
  duration: string;
  status: InterventionStatus;
  priority: 'normale' | 'haute';
  distanceFromPrevious: string;
  lat: number;
  lng: number;
}

interface Technician {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: TechStatus;
  currentLocation: string;
  avatar: string;
  interventions: Record<string, Intervention[]>; // date -> interventions
}

// Status config
const TECH_STATUS_CONFIG: Record<TechStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  disponible: { label: 'Disponible', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
  en_intervention: { label: 'En intervention', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Wrench },
  absent: { label: 'Absent', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Pause },
};

const INTERVENTION_STATUS_CONFIG: Record<InterventionStatus, { label: string; color: string; bg: string }> = {
  planifie: { label: 'Planifie', color: 'text-blue-700', bg: 'bg-blue-50' },
  en_cours: { label: 'En cours', color: 'text-amber-700', bg: 'bg-amber-50' },
  termine: { label: 'Termine', color: 'text-green-700', bg: 'bg-green-50' },
};

function getWeekDates(baseDate: Date): string[] {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const TODAY = new Date().toISOString().split('T')[0];

// Mock data
const MOCK_TECHNICIANS: Technician[] = [
  {
    id: 't1', name: 'Marc Lefebvre', phone: '06 12 34 56 78', zone: 'Paris & Ile-de-France',
    status: 'en_intervention', currentLocation: 'Paris 15e', avatar: 'ML',
    interventions: {
      [TODAY]: [
        { id: 'i1', patientName: 'Jean Dupont', patientAddress: '12 rue de Paris, 75015', patientPhone: '06 11 22 33 44', type: 'Installation PPC', time: '09:00', duration: '1h30', status: 'termine', priority: 'normale', distanceFromPrevious: '-', lat: 48.8422, lng: 2.2945 },
        { id: 'i2', patientName: 'Paul Durand', patientAddress: '8 bd Voltaire, 75011', patientPhone: '06 55 66 77 88', type: 'Depannage urgent', time: '11:00', duration: '1h', status: 'en_cours', priority: 'haute', distanceFromPrevious: '6.2 km', lat: 48.8601, lng: 2.3716 },
        { id: 'i3', patientName: 'Anne Moreau', patientAddress: '34 rue de Rivoli, 75004', patientPhone: '06 99 88 77 66', type: 'Remplacement masque', time: '14:00', duration: '45min', status: 'planifie', priority: 'normale', distanceFromPrevious: '3.1 km', lat: 48.8566, lng: 2.3522 },
        { id: 'i4', patientName: 'Luc Bernard', patientAddress: '5 avenue des Champs-Elysees, 75008', patientPhone: '06 44 33 22 11', type: 'Controle annuel', time: '15:30', duration: '1h', status: 'planifie', priority: 'normale', distanceFromPrevious: '2.8 km', lat: 48.8698, lng: 2.3075 },
      ],
    },
  },
  {
    id: 't2', name: 'Sophie Morel', phone: '06 98 76 54 32', zone: 'Lyon & Rhone-Alpes',
    status: 'disponible', currentLocation: 'Lyon 3e', avatar: 'SM',
    interventions: {
      [TODAY]: [
        { id: 'i5', patientName: 'Marie Martin', patientAddress: '45 avenue Foch, 69003', patientPhone: '06 22 33 44 55', type: 'Remplacement machine', time: '10:00', duration: '2h', status: 'termine', priority: 'normale', distanceFromPrevious: '-', lat: 45.7578, lng: 4.8320 },
        { id: 'i6', patientName: 'Claire Petit', patientAddress: '22 rue Garibaldi, 69100', patientPhone: '06 66 77 88 99', type: 'Changement filtre', time: '14:30', duration: '30min', status: 'planifie', priority: 'normale', distanceFromPrevious: '4.5 km', lat: 45.7640, lng: 4.8557 },
      ],
    },
  },
  {
    id: 't3', name: 'Luc Garnier', phone: '06 45 67 89 01', zone: 'Paris & Ile-de-France',
    status: 'absent', currentLocation: '-', avatar: 'LG',
    interventions: {},
  },
];

export function TechnicianPlanning() {
  const [technicians] = useState<Technician[]>(MOCK_TECHNICIANS);
  const [selectedTech, setSelectedTech] = useState<string>(technicians[0].id);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const tech = technicians.find(t => t.id === selectedTech)!;
  const dayInterventions = tech.interventions[selectedDate] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Planning techniciens</h1>
        <p className="text-[#86868B] mt-1">Geolocalisaton, planning et optimisation des tournees</p>
      </div>

      {/* Technician Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {technicians.map(t => {
          const cfg = TECH_STATUS_CONFIG[t.status];
          const Icon = cfg.icon;
          const todayCount = (t.interventions[TODAY] || []).length;
          const isSelected = selectedTech === t.id;
          return (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTech(t.id)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                isSelected ? 'border-[#3b82f6] bg-blue-50/30 shadow-lg' : 'border-[#E5E5EA] bg-white hover:border-[#D1D1D6]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white font-bold">
                  {t.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1D1D1F]">{t.name}</div>
                  <div className="text-xs text-[#86868B] flex items-center gap-1"><MapPin className="w-3 h-3" />{t.zone}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} flex items-center gap-1`}>
                  <Icon className="w-3 h-3" />{cfg.label}
                </span>
                <span className="text-sm text-[#86868B]">{todayCount} RDV aujourd'hui</span>
              </div>
              {t.status !== 'absent' && (
                <div className="text-xs text-[#86868B] mt-2 flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Position: {t.currentLocation}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-full hover:bg-[#F5F5F7] transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#86868B]" />
          </button>
          <h3 className="font-semibold text-[#1D1D1F]">Semaine du {formatDateShort(weekDates[0])}</h3>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-full hover:bg-[#F5F5F7] transition-colors">
            <ChevronRight className="w-5 h-5 text-[#86868B]" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map(date => {
            const isToday = date === TODAY;
            const isSelected = date === selectedDate;
            const count = (tech.interventions[date] || []).length;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`py-3 px-2 rounded-xl text-center transition-all ${
                  isSelected ? 'bg-[#3b82f6] text-white shadow-lg' :
                  isToday ? 'bg-blue-50 text-[#3b82f6] border border-[#3b82f6]' :
                  'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                }`}
              >
                <div className="text-xs font-medium">{formatDateShort(date).split(' ')[0]}</div>
                <div className="text-lg font-bold">{new Date(date + 'T00:00:00').getDate()}</div>
                {count > 0 && (
                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-[#86868B]'}`}>{count} RDV</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1D1D1F]">
            {tech.name} - {formatDateShort(selectedDate)}
          </h2>
          {dayInterventions.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-[#86868B]">
              <Navigation className="w-4 h-4 text-[#3b82f6]" />
              Tournee optimisee par proximite
            </div>
          )}
        </div>

        {dayInterventions.length === 0 ? (
          <div className="text-center py-12 text-[#86868B] bg-white rounded-2xl border border-[#E5E5EA]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucune intervention planifiee</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayInterventions.map((intervention, index) => {
              const statusCfg = INTERVENTION_STATUS_CONFIG[intervention.status];
              return (
                <div key={intervention.id} className="relative">
                  {/* Distance indicator */}
                  {index > 0 && intervention.distanceFromPrevious !== '-' && (
                    <div className="flex items-center gap-2 py-2 pl-8">
                      <div className="h-6 w-0.5 bg-[#E5E5EA]" />
                      <span className="text-xs text-[#86868B] flex items-center gap-1">
                        <Navigation className="w-3 h-3" />{intervention.distanceFromPrevious}
                      </span>
                    </div>
                  )}

                  <div className={`bg-white rounded-2xl border overflow-hidden ${
                    intervention.priority === 'haute' ? 'border-red-200' : 'border-[#E5E5EA]'
                  }`}>
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Time */}
                      <div className="flex items-center gap-3 sm:w-32 shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusCfg.bg}`}>
                          <Clock className={`w-5 h-5 ${statusCfg.color}`} />
                        </div>
                        <div>
                          <div className="font-bold text-[#1D1D1F]">{intervention.time}</div>
                          <div className="text-xs text-[#86868B]">{intervention.duration}</div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1D1D1F]">{intervention.patientName}</span>
                          {intervention.priority === 'haute' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#86868B] mt-0.5">{intervention.type}</div>
                        <div className="text-xs text-[#86868B] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{intervention.patientAddress}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <a href={`tel:${intervention.patientPhone}`} className="p-2 rounded-full hover:bg-[#F5F5F7] transition-colors">
                          <Phone className="w-4 h-4 text-[#86868B]" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-[#F5F5F7] rounded-2xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-4">Resume de la journee - {tech.name}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1D1D1F]">{dayInterventions.length}</div>
            <div className="text-xs text-[#86868B]">Interventions</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{dayInterventions.filter(i => i.status === 'termine').length}</div>
            <div className="text-xs text-[#86868B]">Terminees</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{dayInterventions.filter(i => i.status === 'planifie').length}</div>
            <div className="text-xs text-[#86868B]">A venir</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1D1D1F]">
              {dayInterventions.reduce((sum, i) => sum + parseFloat(i.distanceFromPrevious) || 0, 0).toFixed(1)} km
            </div>
            <div className="text-xs text-[#86868B]">Distance totale</div>
          </div>
        </div>
      </div>
    </div>
  );
}
