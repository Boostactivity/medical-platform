import { motion } from 'motion/react';

export default function Solutions() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-12 sm:pb-20">
        <div className="max-w-[980px] w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-semibold text-[#1d1d1f] mb-6">
              Solutions d'appareillage
            </h1>
            <p className="text-base sm:text-lg lg:text-[21px] text-[#86868b] max-w-[600px] mx-auto leading-[1.38]">
              Des dispositifs médicaux certifiés et un accompagnement complet 
              pour traiter efficacement l'apnée du sommeil
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Solutions */}
      <section className="py-12 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-32">
          {/* PPC Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-semibold text-[#1d1d1f] mb-6">
                Appareils PPC
              </h2>
              <p className="text-base sm:text-lg lg:text-[21px] text-[#86868b] mb-8 leading-[1.38]">
                Dispositifs de pression positive continue de dernière génération. 
                Silencieux, efficaces et confortables.
              </p>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">AutoSet™</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Technologie d'ajustement automatique de la pression en temps réel 
                    pour un confort optimal tout au long de la nuit
                  </p>
                </div>

                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">Silence absolu</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Niveau sonore inférieur à 26 dB, plus silencieux qu'un murmure
                  </p>
                </div>

                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">Design compact</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Léger (1,2 kg) et élégant, facile à transporter et à utiliser
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#fbfbfd] rounded-[28px] aspect-square flex items-center justify-center"
            >
              <div className="text-center p-6 sm:p-12">
                <div className="text-4xl sm:text-6xl lg:text-[72px] font-semibold text-[#1d1d1f] mb-4">&lt; 26 dB</div>
                <div className="text-base sm:text-lg lg:text-[21px] text-[#86868b]">Plus silencieux qu'un murmure</div>
              </div>
            </motion.div>
          </div>

          {/* Télésurveillance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="order-2 lg:order-1 bg-gradient-to-br from-[#0071e3] to-[#0077ed] rounded-[28px] aspect-square flex items-center justify-center text-white p-12"
            >
              <div className="space-y-6">
                <div className="text-3xl sm:text-4xl lg:text-[48px] font-semibold">100%</div>
                <div className="text-base sm:text-lg lg:text-[21px] opacity-90">des données transmises en temps réel</div>
                <div className="pt-6 border-t border-white/20">
                  <div className="text-xl sm:text-2xl lg:text-[28px] font-semibold">24h</div>
                  <div className="text-sm sm:text-base lg:text-[17px] opacity-80">Délai de détection d'anomalie</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-semibold text-[#1d1d1f] mb-6">
                Télésurveillance
              </h2>
              <p className="text-base sm:text-lg lg:text-[21px] text-[#86868b] mb-8 leading-[1.38]">
                Suivi en temps réel de votre traitement grâce à notre plateforme 
                cloud sécurisée
              </p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">Application mobile</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Consultez vos données à tout moment sur votre smartphone
                  </p>
                </div>

                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">Alertes intelligentes</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Notifications en cas d'anomalie pour une intervention rapide
                  </p>
                </div>

                <div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">Rapports automatiques</h3>
                  <p className="text-[17px] text-[#86868b] leading-[1.47]">
                    Rapports détaillés générés automatiquement pour votre médecin
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Accompagnement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-semibold text-[#1d1d1f] mb-6">
                Accompagnement personnalisé
              </h2>
              <p className="text-base sm:text-lg lg:text-[21px] text-[#86868b] mb-8 leading-[1.38]">
                Un suivi régulier par nos techniciens spécialisés pour garantir 
                l'efficacité de votre traitement
              </p>

              <div className="space-y-6">
                {[
                  'Installation à domicile',
                  'Formation à l\'utilisation',
                  'Visites de suivi régulières',
                  'Support téléphonique 24/7',
                  'Remplacement des accessoires',
                ].map((item) => (
                  <div key={item} className="flex items-start">
                    <svg className="w-6 h-6 text-[#0071e3] mr-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[19px] text-[#1d1d1f]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#fbfbfd] rounded-[28px] p-12"
            >
              <div className="space-y-10">
                <div>
                  <div className="text-3xl sm:text-4xl lg:text-[56px] font-semibold text-[#1d1d1f] mb-2">150+</div>
                  <div className="text-base sm:text-lg lg:text-[19px] text-[#86868b]">Techniciens spécialisés</div>
                </div>
                <div className="border-t border-black/5 pt-10">
                  <div className="text-3xl sm:text-4xl lg:text-[56px] font-semibold text-[#1d1d1f] mb-2">40h</div>
                  <div className="text-base sm:text-lg lg:text-[19px] text-[#86868b]">Formation annuelle</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Reimbursement */}
      <section className="py-12 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-semibold text-[#1d1d1f] mb-6">
              Prise en charge à 100%
            </h2>
            <p className="text-base sm:text-lg lg:text-[21px] text-[#86868b] max-w-[700px] mx-auto mb-12 leading-[1.38]">
              Remboursement intégral par l'Assurance maladie. 
              Tiers payant systématique, aucun frais à avancer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-16">
              {[
                { title: 'Remboursement', desc: 'Pris en charge à 100%' },
                { title: 'Tiers payant', desc: 'Aucune avance de frais' },
                { title: 'Accessoires', desc: 'Remplacement inclus' },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="bg-white rounded-[18px] p-8 shadow-sm"
                >
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">{item.title}</h3>
                  <p className="text-[17px] text-[#86868b]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}