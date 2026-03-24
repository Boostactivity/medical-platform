import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Assistance() {
  const [showProblemes, setShowProblemes] = useState(false);

  const problemes = [
    {
      icon: '😣',
      titre: 'Gêne avec le masque',
      description: 'Le masque est inconfortable ou laisse des marques',
      action: 'Obtenir de l\'aide',
    },
    {
      icon: '😰',
      titre: 'Sensation d\'étouffement',
      description: 'Je me sens oppressé avec la pression',
      action: 'Parler à un technicien',
    },
    {
      icon: '🔊',
      titre: 'Bruit gênant',
      description: 'La machine ou le masque fait du bruit',
      action: 'Diagnostiquer le bruit',
    },
    {
      icon: '⚠️',
      titre: 'Panne ou dysfonctionnement',
      description: 'La machine ne fonctionne pas correctement',
      action: 'Signaler une panne',
    },
  ];

  const tutoriels = [
    {
      titre: 'Bien positionner son masque',
      duree: '2:30',
      vignette: '🎭',
      url: '#',
    },
    {
      titre: 'Nettoyer sa machine PPC',
      duree: '3:15',
      vignette: '🧼',
      url: '#',
    },
    {
      titre: 'Astuces pour s\'endormir avec le masque',
      duree: '4:20',
      vignette: '💤',
      url: '#',
    },
    {
      titre: 'Que faire en cas de fuite ?',
      duree: '2:45',
      vignette: '💨',
      url: '#',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-[21px] font-semibold text-[#1a2b3c]">Assistance</h3>
          <p className="text-[13px] text-[#64748b]">Besoin d'aide ? Nous sommes là pour vous</p>
        </div>
      </div>

      {/* Bouton "J'ai un problème" */}
      <button
        onClick={() => setShowProblemes(!showProblemes)}
        className="w-full bg-gradient-to-r from-[#ef4444] to-[#f87171] text-white rounded-2xl p-6 mb-6 hover:shadow-2xl transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-[24px]">🆘</span>
            </div>
            <div className="text-left">
              <div className="text-[17px] font-semibold mb-1">J'ai un problème</div>
              <div className="text-[13px] text-white/80">Cliquez ici pour obtenir de l'aide rapidement</div>
            </div>
          </div>
          <svg
            className={`w-6 h-6 transition-transform ${showProblemes ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Liste des problèmes */}
      <AnimatePresence>
        {showProblemes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 space-y-3"
          >
            {problemes.map((probleme, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#3b82f6] hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-[32px]">{probleme.icon}</div>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold text-[#1a2b3c] mb-1">{probleme.titre}</div>
                    <div className="text-[13px] text-[#64748b]">{probleme.description}</div>
                  </div>
                  <div className="text-[13px] text-[#3b82f6] font-medium group-hover:underline">
                    {probleme.action} →
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact rapide */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="bg-[#dbeafe] border border-[#3b82f6]/20 rounded-xl p-5 hover:bg-[#bfdbfe] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3b82f6] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[14px] font-semibold text-[#1a2b3c]">Chat en ligne</div>
              <div className="text-[12px] text-[#64748b]">Réponse en 2 min</div>
            </div>
          </div>
        </button>

        <button className="bg-[#d1fae5] border border-[#10b981]/20 rounded-xl p-5 hover:bg-[#a7f3d0] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[14px] font-semibold text-[#1a2b3c]">Être rappelé</div>
              <div className="text-[12px] text-[#64748b]">Sous 1 heure</div>
            </div>
          </div>
        </button>
      </div>

      {/* Tutoriels vidéo */}
      <div>
        <h4 className="text-[17px] font-semibold text-[#1a2b3c] mb-4 flex items-center gap-2">
          <span>📹</span>
          Tutoriels vidéo
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          {tutoriels.map((tuto, index) => (
            <button
              key={index}
              className="bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#8b5cf6] hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] rounded-lg flex items-center justify-center text-[28px] flex-shrink-0">
                  {tuto.vignette}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#1a2b3c] mb-1 group-hover:text-[#8b5cf6] transition-colors">
                    {tuto.titre}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#64748b]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {tuto.duree}
                  </div>
                </div>
                <svg className="w-5 h-5 text-[#8b5cf6] opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fiche conseils du mois */}
      <div className="mt-6 bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] rounded-2xl p-6 border border-[#8b5cf6]/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#8b5cf6] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <h5 className="text-[15px] font-semibold text-[#1a2b3c] mb-2">💡 Conseil du mois : Décembre 2024</h5>
            <p className="text-[14px] text-[#64748b] leading-relaxed mb-3">
              <strong>Astuce hiver :</strong> L'air froid et sec peut assécher les voies respiratoires. 
              Pensez à utiliser l'humidificateur chauffant de votre machine pour un confort optimal.
            </p>
            <button className="text-[13px] text-[#8b5cf6] font-medium hover:underline">
              En savoir plus →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
