import { motion } from 'motion/react';
import { Wrench, Package, Phone, CheckCircle, Clock } from 'lucide-react';

export interface Intervention {
  id: string;
  type: 'installation' | 'maintenance' | 'mask_delivery' | 'phone_support' | 'repair';
  patientName: string;
  technicianName?: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

interface InterventionTimelineProps {
  interventions: Intervention[];
  onEdit?: (id: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (intervention: Intervention) => void;
}

export function InterventionTimeline({ interventions, onEdit, onStart, onComplete }: InterventionTimelineProps) {
  const getTypeConfig = (type: string) => {
    const configs = {
      installation: {
        icon: <Wrench className="w-4 h-4" />,
        label: 'Installation',
        color: '#007AFF',
      },
      maintenance: {
        icon: <Wrench className="w-4 h-4" />,
        label: 'Maintenance',
        color: '#FF9500',
      },
      mask_delivery: {
        icon: <Package className="w-4 h-4" />,
        label: 'Livraison masque',
        color: '#34C759',
      },
      phone_support: {
        icon: <Phone className="w-4 h-4" />,
        label: 'Support téléphonique',
        color: '#5AC8FA',
      },
      repair: {
        icon: <Wrench className="w-4 h-4" />,
        label: 'Réparation',
        color: '#FF3B30',
      },
    };
    return configs[type as keyof typeof configs] || configs.installation;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      scheduled: {
        label: 'Planifié',
        color: '#007AFF',
        bg: 'bg-[#007AFF]/10',
        icon: <Clock className="w-4 h-4" />,
      },
      in_progress: {
        label: 'En cours',
        color: '#FF9500',
        bg: 'bg-[#FF9500]/10',
        icon: <Clock className="w-4 h-4" />,
      },
      completed: {
        label: 'Terminé',
        color: '#34C759',
        bg: 'bg-[#34C759]/10',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      cancelled: {
        label: 'Annulé',
        color: '#86868B',
        bg: 'bg-[#86868B]/10',
        icon: <CheckCircle className="w-4 h-4" />,
      },
    };
    return configs[status as keyof typeof configs] || configs.scheduled;
  };

  const sortedInterventions = [...interventions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl text-[#1D1D1F] mb-1">Planning interventions</h3>
          <p className="text-sm text-[#86868B]">
            {interventions.filter(i => i.status === 'scheduled').length} prévues ·{' '}
            {interventions.filter(i => i.status === 'in_progress').length} en cours
          </p>
        </div>
        <button className="px-5 py-2 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-all">
          + Nouvelle intervention
        </button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#E5E5EA]"></div>

        {/* Interventions */}
        <div className="space-y-6">
          {sortedInterventions.map((intervention, index) => {
            const typeConfig = getTypeConfig(intervention.type);
            const statusConfig = getStatusConfig(intervention.status);

            return (
              <motion.div
                key={intervention.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-16"
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: typeConfig.color }}
                >
                  <span className="text-white">{typeConfig.icon}</span>
                </div>

                {/* Card */}
                <div className="bg-[#F5F5F7] rounded-2xl p-4 hover:bg-[#EBEBED] transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm" style={{ color: typeConfig.color }}>
                          {typeConfig.label}
                        </span>
                        <span className="text-[#86868B]">·</span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${statusConfig.bg}`}
                          style={{ color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <h4 className="text-[#1D1D1F] mb-1">{intervention.patientName}</h4>
                      {intervention.technicianName && (
                        <p className="text-sm text-[#86868B]">
                          Technicien : {intervention.technicianName}
                        </p>
                      )}
                      {intervention.notes && (
                        <p className="text-sm text-[#86868B] mt-2 italic">{intervention.notes}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm text-[#86868B] mb-2">
                        {new Date(intervention.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex flex-col gap-1">
                        {onStart && intervention.status === 'scheduled' && (
                          <button
                            onClick={() => onStart(intervention.id)}
                            className="text-sm text-[#FF9500] hover:underline"
                          >
                            Démarrer
                          </button>
                        )}
                        {onComplete && intervention.status === 'in_progress' && (
                          <button
                            onClick={() => onComplete(intervention)}
                            className="text-sm text-[#34C759] hover:underline"
                          >
                            Terminer
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(intervention.id)}
                            className="text-sm text-[#007AFF] hover:underline"
                          >
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
