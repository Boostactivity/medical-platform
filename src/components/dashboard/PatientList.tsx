import React, { useState, useMemo } from 'react';
import { Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import NotificationBadge from '../NotificationBadge';

export interface Patient {
  id: string;
  nom: string;
  prenom: string;
  numeroSerieMachine: string;
  derniereSynchro: string; // ISO date string
  statutIAH: number; // Index d'Apnée-Hypopnée
  hasAlert: boolean;
  alertCount?: number;
}

interface PatientListProps {
  patients: Patient[];
  onPatientClick?: (patient: Patient) => void;
}

export function PatientList({ patients, onPatientClick }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'tous' | 'alerte'>('tous');

  // Fonction pour déterminer le statut IAH
  const getIAHStatus = (iah: number): { label: string; color: string; bgColor: string } => {
    if (iah < 5) {
      return {
        label: 'Normal',
        color: 'text-[#34C759]',
        bgColor: 'bg-[#34C759]/10'
      };
    } else if (iah >= 5 && iah < 15) {
      return {
        label: 'Léger',
        color: 'text-[#FFD60A]',
        bgColor: 'bg-[#FFD60A]/10'
      };
    } else if (iah >= 15 && iah < 30) {
      return {
        label: 'Modéré',
        color: 'text-[#FF9500]',
        bgColor: 'bg-[#FF9500]/10'
      };
    } else {
      return {
        label: 'Sévère',
        color: 'text-[#FF3B30]',
        bgColor: 'bg-[#FF3B30]/10'
      };
    }
  };

  // Fonction pour formater la date de synchro
  const formatSynchroDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'À l\'instant';
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Filtrage des patients
  const filteredPatients = useMemo(() => {
    let result = patients;

    // Filtre par recherche
    if (searchTerm.trim()) {
      result = result.filter(patient => {
        const fullName = `${patient.nom} ${patient.prenom}`.toLowerCase();
        const search = searchTerm.toLowerCase();
        return (
          fullName.includes(search) ||
          patient.numeroSerieMachine.toLowerCase().includes(search) ||
          patient.id.toLowerCase().includes(search)
        );
      });
    }

    // Filtre par alerte
    if (filter === 'alerte') {
      result = result.filter(patient => patient.hasAlert);
    }

    return result;
  }, [patients, searchTerm, filter]);

  // Comptage pour les badges de filtre
  const alertCount = patients.filter(p => p.hasAlert).length;

  return (
    <div className="space-y-4">
      {/* Header avec recherche et filtres */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Barre de recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-all"
            />
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('tous')}
              className={`px-4 py-2.5 rounded-lg transition-all ${
                filter === 'tous'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-[#F8F9FA] text-[#86868B] hover:bg-[#E9ECEF]'
              }`}
            >
              Tous
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === 'tous'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E5E5EA] text-[#86868B]'
              }`}>
                {patients.length}
              </span>
            </button>

            <button
              onClick={() => setFilter('alerte')}
              className={`relative px-4 py-2.5 rounded-lg transition-all ${
                filter === 'alerte'
                  ? 'bg-[#FF3B30] text-white shadow-sm'
                  : 'bg-[#F8F9FA] text-[#86868B] hover:bg-[#E9ECEF]'
              }`}
            >
              Alertes
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === 'alerte'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FF3B30]/10 text-[#FF3B30]'
              }`}>
                {alertCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des patients */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
        {/* Header du tableau (desktop uniquement) */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-[#F8F9FA] border-b border-[#E5E5EA]">
          <div className="col-span-3">
            <p className="text-sm text-[#86868B]">Patient</p>
          </div>
          <div className="col-span-3">
            <p className="text-sm text-[#86868B]">N° Série Machine</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-[#86868B]">Dernière Synchro</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-[#86868B]">Statut IAH</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-[#86868B]">Actions</p>
          </div>
        </div>

        {/* Liste des patients */}
        <div className="divide-y divide-[#E5E5EA]">
          {filteredPatients.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="w-12 h-12 text-[#86868B] mx-auto mb-3" />
              <p className="text-[#86868B]">
                {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
              </p>
            </div>
          ) : (
            filteredPatients.map((patient, index) => {
              const iahStatus = getIAHStatus(patient.statutIAH);
              
              return (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => onPatientClick?.(patient)}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 hover:bg-[#F8F9FA] transition-all ${
                    onPatientClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Nom du patient */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-full flex items-center justify-center text-white">
                        {patient.prenom.charAt(0)}{patient.nom.charAt(0)}
                      </div>
                      {patient.hasAlert && patient.alertCount && (
                        <NotificationBadge count={patient.alertCount} />
                      )}
                    </div>
                    <div>
                      <p className="text-[#1D1D1F]">
                        {patient.prenom} {patient.nom}
                      </p>
                      <p className="text-xs text-[#86868B] md:hidden">
                        ID: {patient.id}
                      </p>
                    </div>
                  </div>

                  {/* Numéro de série machine */}
                  <div className="col-span-1 md:col-span-3 flex items-center">
                    <div>
                      <p className="text-sm md:hidden text-[#86868B] mb-1">N° Série Machine</p>
                      <p className="text-[#1D1D1F] font-mono text-sm">
                        {patient.numeroSerieMachine}
                      </p>
                    </div>
                  </div>

                  {/* Dernière synchro */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                    <div className="md:hidden">
                      <p className="text-sm text-[#86868B] mb-1">Dernière Synchro</p>
                    </div>
                    <Clock className="w-4 h-4 text-[#86868B] hidden md:block" />
                    <p className="text-sm text-[#86868B]">
                      {formatSynchroDate(patient.derniereSynchro)}
                    </p>
                  </div>

                  {/* Statut IAH */}
                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <div>
                      <p className="text-sm md:hidden text-[#86868B] mb-1">Statut IAH</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${iahStatus.color} ${iahStatus.bgColor}`}>
                          {iahStatus.label}
                        </span>
                        <span className="text-sm text-[#86868B]">
                          ({patient.statutIAH})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                    {patient.hasAlert ? (
                      <div className="flex items-center gap-2 text-[#FF3B30]">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Alerte</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#34C759]">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm md:hidden">OK</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer avec résumé */}
      {filteredPatients.length > 0 && (
        <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-[#E5E5EA]">
          <div className="flex items-center justify-between text-sm">
            <p className="text-[#86868B]">
              Affichage de <span className="text-[#1D1D1F]">{filteredPatients.length}</span> patient{filteredPatients.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${patients.length} au total`}
            </p>
            
            {alertCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                <p className="text-[#FF3B30]">
                  {alertCount} alerte{alertCount > 1 ? 's' : ''} active{alertCount > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
