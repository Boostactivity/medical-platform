import { useState } from 'react';
import { X, Phone, CheckCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResolveAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (data: ResolutionData) => void;
  alert?: { // 🆕 Rendre alert optionnel pour éviter les erreurs TypeScript
    id: string;
    patientName: string;
    message: string;
  };
}

export interface ResolutionData {
  method: 'phone' | 'false_positive' | 'other';
  notes: string;
  contactedAt?: string;
}

const resolutionMethods = [
  {
    value: 'phone',
    label: 'Résolu par téléphone',
    icon: Phone,
    description: 'Contact téléphonique avec le patient',
    color: '#34C759',
  },
  {
    value: 'false_positive',
    label: 'Faux positif',
    icon: CheckCircle,
    description: 'Alerte non pertinente ou erreur système',
    color: '#007AFF',
  },
  {
    value: 'other',
    label: 'Autre résolution',
    icon: FileText,
    description: 'Résolu par un autre moyen',
    color: '#FF9500',
  },
];

export function ResolveAlertModal({ isOpen, onClose, onResolve, alert }: ResolveAlertModalProps) {
  const [formData, setFormData] = useState<ResolutionData>({
    method: 'phone',
    notes: '',
    contactedAt: new Date().toISOString(),
  });

  // 🆕 Guard: ne pas rendre si pas d'alerte
  if (!alert) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.notes.trim()) {
      window.alert('Veuillez ajouter des notes sur la résolution'); // 🆕 Changé alert() en window.alert()
      return;
    }
    onResolve(formData);
    onClose();
    // Reset form
    setFormData({
      method: 'phone',
      notes: '',
      contactedAt: new Date().toISOString(),
    });
  };

  const selectedMethod = resolutionMethods.find(m => m.value === formData.method);

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
                    <h2 className="text-2xl text-[#1D1D1F]">Résoudre l'alerte</h2>
                    <p className="text-sm text-[#86868B] mt-1">
                      {alert.patientName}
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
                <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-2xl p-4">
                  <p className="text-sm text-[#1D1D1F]">
                    <strong>Alerte :</strong>
                  </p>
                  <p className="text-sm text-[#86868B] mt-1">{alert.message}</p>
                </div>

                {/* Méthode de résolution */}
                <div>
                  <label className="block text-[#1D1D1F] mb-3">Méthode de résolution *</label>
                  <div className="space-y-3">
                    {resolutionMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, method: method.value as any })}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                            formData.method === method.value
                              ? 'border-[#FF9500] bg-[#FF9500]/10'
                              : 'border-gray-200 hover:border-[#FF9500]/50'
                          }`}
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${method.color}20`, color: method.color }}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[#1D1D1F]">{method.label}</div>
                            <div className="text-xs text-[#86868B] mt-1">{method.description}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.method === method.value
                              ? 'border-[#FF9500] bg-[#FF9500]'
                              : 'border-gray-300'
                          }`}>
                            {formData.method === method.value && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[#1D1D1F] mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notes de résolution *
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border-2 border-transparent rounded-xl focus:border-[#FF9500] focus:bg-white transition-all outline-none resize-none"
                    rows={5}
                    placeholder={
                      formData.method === 'phone'
                        ? 'Détails de l\'échange téléphonique, conseils donnés, actions entreprises...'
                        : formData.method === 'false_positive'
                        ? 'Raison du faux positif, contexte, corrections à apporter...'
                        : 'Détails sur la résolution de l\'alerte...'
                    }
                    required
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
                    className="flex-1 px-6 py-4 text-white rounded-full transition-all shadow-lg"
                    style={{ backgroundColor: selectedMethod?.color }}
                  >
                    Marquer comme résolu
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