import { useState } from 'react';
import { HelpCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export function QuickHelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </motion.button>

      {/* Help Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-8 w-96 max-w-[calc(100vw-4rem)] bg-white rounded-3xl shadow-2xl border-2 border-[#007AFF]/20 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="w-6 h-6" />
                <h3 className="text-xl">Aide rapide</h3>
              </div>
              <p className="text-sm opacity-90">
                Problème de connexion ? Voici les solutions.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Solution 1 */}
              <div className="bg-[#FF9500]/10 border-2 border-[#FF9500] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#FF9500] rounded-full flex items-center justify-center flex-shrink-0 text-white">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#1D1D1F] mb-2">Déconnexion forcée</h4>
                    <p className="text-sm text-[#86868B] mb-3">
                      Efface tous les tokens en cache (30 sec)
                    </p>
                    <Link
                      to="/force-logout"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9500] text-white rounded-full text-sm hover:bg-[#E68A00] transition-all"
                    >
                      Déconnexion forcée
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Solution 2 */}
              <div className="bg-[#007AFF]/10 border-2 border-[#007AFF] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 text-white">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#1D1D1F] mb-2">Réparation complète</h4>
                    <p className="text-sm text-[#86868B] mb-3">
                      Recréer les comptes avec les bons rôles (2 min)
                    </p>
                    <Link
                      to="/fix-auth"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-full text-sm hover:bg-[#0051D5] transition-all"
                    >
                      Réparer l'authentification
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Solution 3 */}
              <div className="bg-[#34C759]/10 border-2 border-[#34C759] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#34C759] rounded-full flex items-center justify-center flex-shrink-0 text-white">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#1D1D1F] mb-2">Guide complet</h4>
                    <p className="text-sm text-[#86868B] mb-3">
                      Explications détaillées et solutions multiples
                    </p>
                    <Link
                      to="/aide-auth"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#34C759] text-white rounded-full text-sm hover:bg-[#28A745] transition-all"
                    >
                      Guide d'aide
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Credentials Reminder */}
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <h4 className="text-[#1D1D1F] mb-3">🔑 Identifiants de démo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#86868B]">Patient :</span>
                    <span className="text-[#1D1D1F] font-mono">testpatient@demo.fr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#86868B]">Médecin :</span>
                    <span className="text-[#1D1D1F] font-mono">testmedecin@demo.fr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#86868B]">Admin :</span>
                    <span className="text-[#1D1D1F] font-mono">admin@demo.fr</span>
                  </div>
                  <div className="pt-2 border-t border-[#86868B]/20">
                    <span className="text-[#86868B]">Mot de passe :</span>
                    <span className="text-[#1D1D1F] font-mono ml-2">Test-123</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#F5F5F7] p-4 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-[#86868B] hover:text-[#007AFF] transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
    </>
  );
}