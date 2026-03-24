import { motion } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function Technology() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="min-h-[70vh] flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-[980px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <h1 className="text-[#1d1d1f] mb-6">
              Technologie de pointe
            </h1>
            <p className="text-[21px] text-[#86868b] max-w-[700px] mx-auto leading-[1.38]">
              Nos dispositifs intègrent les innovations les plus avancées 
              pour garantir efficacité et confort
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="aspect-[16/9] rounded-[28px] overflow-hidden shadow-2xl"
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1763070282912-08b63e2eb427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMGRldmljZXxlbnwxfHx8fDE3NjQ1NzY4MDF8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Technologie"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* AutoSet */}
      <section className="py-32 px-6 bg-[#fbfbfd]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-[#1d1d1f] mb-6">
                AutoSet™ Technology
              </h2>
              <p className="text-[21px] text-[#86868b] mb-8 leading-[1.38]">
                Notre technologie AutoSet analyse votre respiration en temps réel 
                et ajuste automatiquement la pression délivrée
              </p>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-[#0071e3] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-white text-[19px]">1</span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-2">Analyse continue</h3>
                    <p className="text-[17px] text-[#86868b] leading-[1.47]">
                      Monitoring permanent de votre respiration tout au long de la nuit
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-[#0071e3] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-white text-[19px]">2</span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-2">Ajustement intelligent</h3>
                    <p className="text-[17px] text-[#86868b] leading-[1.47]">
                      Adaptation automatique à vos changements de position et cycles de sommeil
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-[#0071e3] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-white text-[19px]">3</span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-2">Confort maximal</h3>
                    <p className="text-[17px] text-[#86868b] leading-[1.47]">
                      Pression minimale nécessaire pour un traitement efficace et confortable
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-[28px] p-12 shadow-xl"
            >
              <div className="space-y-8">
                <div>
                  <div className="text-[48px] font-semibold text-[#1d1d1f] mb-2">±0.5</div>
                  <div className="text-[19px] text-[#86868b]">cmH₂O de précision</div>
                </div>
                <div className="border-t border-black/5 pt-8">
                  <div className="text-[48px] font-semibold text-[#1d1d1f] mb-2">50+</div>
                  <div className="text-[19px] text-[#86868b]">Paramètres analysés en temps réel</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Cloud & Security */}
      <section className="py-32 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-[#1d1d1f] mb-6">
              Cloud médical sécurisé
            </h2>
            <p className="text-[21px] text-[#86868b] max-w-[700px] mx-auto mb-16 leading-[1.38]">
              Infrastructure certifiée HDS garantissant la confidentialité 
              et la sécurité de vos données médicales
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '🔒', title: 'Chiffrement', desc: 'SSL/TLS et AES-256' },
                { icon: '🏥', title: 'Certifié HDS', desc: 'Hébergement de données de santé' },
                { icon: '🇫🇷', title: 'Données en France', desc: 'Conforme RGPD' },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="bg-[#fbfbfd] rounded-[18px] p-10"
                >
                  <div className="text-[56px] mb-4">{item.icon}</div>
                  <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">{item.title}</h3>
                  <p className="text-[17px] text-[#86868b]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-32 px-6 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-[#1d1d1f] mb-6">
              Certifications
            </h2>
            <p className="text-[21px] text-[#86868b] max-w-[700px] mx-auto mb-16 leading-[1.38]">
              Conformité totale aux normes les plus strictes
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['CE', 'ISO 13485', 'HDS', 'RGPD'].map((cert, index) => (
                <motion.div
                  key={cert}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-[18px] p-8 shadow-sm"
                >
                  <div className="text-[32px] font-semibold text-[#1d1d1f]">{cert}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
