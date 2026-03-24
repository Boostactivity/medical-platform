import { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CreateInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InterventionData) => void;
  alert?: {
    patientName: string;
    patientId: string;
    patient?: {
      id: string;
    };
    message: string;
  };
  patients: Patient[];
}

export interface InterventionData {
  type: 'installation' | 'maintenance' | 'repair' | 'mask_delivery' | 'phone_support';
  patientId?: string;
  patientName: string;
  technicianName: string;
  date: string;
  notes: string;
  material?: string;
}

const technicians = [
  { id: '1', name: 'Marc Leblanc', available: true },
  { id: '2', name: 'Sophie Petit', available: true },
  { id: '3', name: 'Thomas Dubois', available: false },
];

const interventionTypes = [
  { value: 'installation', label: '🏠 Installation machine', icon: Package },
  { value: 'maintenance', label: '🔧 Maintenance', icon: Package },
  { value: 'repair', label: '⚙️ Réparation', icon: Package },
  { value: 'mask_delivery', label: '😷 Livraison masque', icon: Package },
  { value: 'phone_support', label: '📞 Support téléphonique', icon: User },
];

export function CreateInterventionModal({ isOpen, onClose, onSubmit, alert, patients }: CreateInterventionModalProps) {
  const [formData, setFormData] = useState<InterventionData>({
    type: 'maintenance',
    patientName: alert?.patientName || '',
    technicianName: '',
    date: new Date().toISOString().split('T')[0],
    notes: alert?.message || '',
    material: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.technicianName) {
      alert('Veuillez sélectionner un technicien');
      return;
    }
    onSubmit(formData);
    onClose();
    // Reset form
    setFormData({
      type: 'maintenance',
      patientName: '',
      technicianName: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      material: '',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl text-[#1D1D1F]">Créer une intervention</h2>
                    <p className="text-sm text-[#86868B] mt-1">
                      Planifier une intervention technique
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F7] transition-colors"
                  >
                    <X className="w-6 h-6 text-[#86868B]" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Alert context */}
                {alert && (
                  <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-2xl p-4">
                    <p className="text-sm text-[#1D1D1F]">
                      <strong>Intervention créée depuis l'alerte :</strong>
                    </p>
                    <p className="text-sm text-[#86868B] mt-1">{alert.message}</p>
                  </div>
                )}

                {/* Type d'intervention */}
                <div>
                  <label className="block text-[#1D1D1F] mb-3">Type d'intervention *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {interventionTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value as any })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.type === type.value
                            ? 'border-[#FF9500] bg-[#FF9500]/10'
                            : 'border-gray-200 hover:border-[#FF9500]/50'
                        }`}
                      >
                        <div className="text-sm text-[#1D1D1F]">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">Patient *</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#FF9500] focus:bg-white transition-all outline-none"
                    placeholder="Nom du patient"
                    required
                  />
                </div>

                {/* Technicien */}
                <div>
                  <label className="block text-[#1D1D1F] mb-3">Technicien assigné *</label>
                  <div className="space-y-2">
                    {technicians.map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => tech.available && setFormData({ ...formData, technicianName: tech.name })}
                        disabled={!tech.available}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                          formData.technicianName === tech.name
                            ? 'border-[#FF9500] bg-[#FF9500]/10'
                            : tech.available
                            ? 'border-gray-200 hover:border-[#FF9500]/50'
                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#FF9500] to-[#FF6B00] rounded-full flex items-center justify-center text-white">
                            {tech.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[#1D1D1F]">{tech.name}</div>
                            <div className="text-xs text-[#86868B]">
                              {tech.available ? 'Disponible' : 'Indisponible'}
                            </div>
                          </div>
                        </div>
                        {tech.available && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.technicianName === tech.name
                              ? 'border-[#FF9500] bg-[#FF9500]'
                              : 'border-gray-300'
                          }`}>
                            {formData.technicianName === tech.name && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date de l'intervention *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#FF9500] focus:bg-white transition-all outline-none"
                    required
                  />
                </div>

                {/* Matériel nécessaire */}
                {formData.type !== 'phone_support' && (
                  <div>
                    <label className="block text-[#1D1D1F] mb-2">
                      <Package className="w-4 h-4 inline mr-2" />
                      Matériel nécessaire
                    </label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#FF9500] focus:bg-white transition-all outline-none"
                      placeholder="Ex: Masque nasal taille M, filtres..."
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#FF9500] focus:bg-white transition-all outline-none resize-none"
                    rows={4}
                    placeholder="Informations complémentaires, instructions spéciales..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-4 bg-[#F5F5F7] text-[#1D1D1F] rounded-full hover:bg-[#E5E5EA] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-[#FF9500] text-white rounded-full hover:bg-[#E68A00] transition-all shadow-lg"
                  >
                    Créer l'intervention
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}