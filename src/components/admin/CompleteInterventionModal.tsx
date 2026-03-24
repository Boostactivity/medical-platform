import { useState } from 'react';
import { X, CheckCircle, FileText, Package, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompleteInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CompletionData) => void;
  intervention: {
    id: string;
    patientName: string;
    type: string;
    technicianName: string;
  };
}

export interface CompletionData {
  duration: string;
  materialUsed: string;
  notes: string;
  patientSatisfaction: number;
  followUpNeeded: boolean;
  followUpNotes?: string;
}

export function CompleteInterventionModal({ isOpen, onClose, onComplete, intervention }: CompleteInterventionModalProps) {
  const [formData, setFormData] = useState<CompletionData>({
    duration: '',
    materialUsed: '',
    notes: '',
    patientSatisfaction: 5,
    followUpNeeded: false,
    followUpNotes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.notes.trim()) {
      alert('Veuillez ajouter un compte-rendu de l\'intervention');
      return;
    }
    onComplete(formData);
    onClose();
    // Reset form
    setFormData({
      duration: '',
      materialUsed: '',
      notes: '',
      patientSatisfaction: 5,
      followUpNeeded: false,
      followUpNotes: '',
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
                    <h2 className="text-2xl text-[#1D1D1F]">Terminer l'intervention</h2>
                    <p className="text-sm text-[#86868B] mt-1">
                      {intervention.patientName} • {intervention.technicianName}
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
                {/* Durée */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Durée de l'intervention
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#34C759] focus:bg-white transition-all outline-none"
                    placeholder="Ex: 1h30, 45 minutes..."
                  />
                </div>

                {/* Matériel utilisé */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Matériel utilisé / livré
                  </label>
                  <input
                    type="text"
                    value={formData.materialUsed}
                    onChange={(e) => setFormData({ ...formData, materialUsed: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#34C759] focus:bg-white transition-all outline-none"
                    placeholder="Ex: Masque nasal taille M, 2 filtres..."
                  />
                </div>

                {/* Compte-rendu */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Compte-rendu d'intervention *
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#34C759] focus:bg-white transition-all outline-none resize-none"
                    rows={6}
                    placeholder="Détails de l'intervention effectuée, problèmes rencontrés, solutions apportées, formation donnée au patient..."
                    required
                  />
                </div>

                {/* Satisfaction patient */}
                <div>
                  <label className="block text-[#1D1D1F] mb-3">
                    Satisfaction patient
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData({ ...formData, patientSatisfaction: rating })}
                        className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                          formData.patientSatisfaction >= rating
                            ? 'border-[#FFD60A] bg-[#FFD60A]/20'
                            : 'border-gray-200 hover:border-[#FFD60A]/50'
                        }`}
                      >
                        <div className="text-2xl">
                          {formData.patientSatisfaction >= rating ? '⭐' : '☆'}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#86868B] mt-2 text-center">
                    {formData.patientSatisfaction === 5 ? 'Très satisfait' :
                     formData.patientSatisfaction === 4 ? 'Satisfait' :
                     formData.patientSatisfaction === 3 ? 'Neutre' :
                     formData.patientSatisfaction === 2 ? 'Peu satisfait' : 'Insatisfait'}
                  </p>
                </div>

                {/* Suivi nécessaire */}
                <div className="bg-[#F5F5F7] rounded-2xl p-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.followUpNeeded}
                      onChange={(e) => setFormData({ ...formData, followUpNeeded: e.target.checked })}
                      className="w-6 h-6 rounded-lg border-2 border-gray-300 text-[#007AFF] focus:ring-[#007AFF]"
                    />
                    <div className="flex-1">
                      <div className="text-[#1D1D1F]">Un suivi est nécessaire</div>
                      <div className="text-sm text-[#86868B]">Cocher si une nouvelle intervention est à prévoir</div>
                    </div>
                  </label>

                  {formData.followUpNeeded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <textarea
                        value={formData.followUpNotes}
                        onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none resize-none"
                        rows={3}
                        placeholder="Détails du suivi nécessaire, date suggérée..."
                      />
                    </motion.div>
                  )}
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
                    className="flex-1 px-6 py-4 bg-[#34C759] text-white rounded-full hover:bg-[#2FB04C] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Terminer l'intervention
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
