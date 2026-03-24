import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="bg-gradient-to-b from-white via-[#f8fafc] to-white">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-6 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0) 70%)' }} />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0) 70%)' }} />
          <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0) 70%)' }} />
        </div>

        <div className="max-w-[1100px] w-full relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="text-center">
            <div className="flex items-center justify-center gap-6 md:gap-12 mb-6 flex-wrap">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-full px-5 py-2">
                <svg className="w-4 h-4 text-[#3b82f6]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="text-[14px] text-[#3b82f6] font-medium">Prestataire de sante agree en France</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-full px-5 py-2">
                <svg className="w-4 h-4 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-[14px] text-[#10b981] font-medium">Accompagnement 24/7 disponible</span>
              </motion.div>
            </div>

            <h1 className="text-[48px] md:text-[64px] leading-[1.1] text-[#1a2b3c] mb-4 max-w-[900px] mx-auto" style={{ fontWeight: 200 }}>
              Mieux respirer la nuit,<br /><span className="text-[#8b5cf6]">vivre mieux le jour.</span>
            </h1>
            <p className="text-[18px] md:text-[21px] text-[#64748b] max-w-[700px] mx-auto leading-[1.6] mb-8" style={{ fontWeight: 300 }}>
              Nous vous accompagnons dans le traitement de l'apnee du sommeil a domicile.
              Prise en charge personnalisee, 100% remboursee par la Securite sociale et votre mutuelle.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-[900px] mx-auto mb-16">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                <Link to="/apnee-sommeil" className="group block bg-gradient-to-br from-[#dbeafe] to-white border border-[#e2e8f0] text-[#1a2b3c] p-8 rounded-2xl hover:shadow-2xl hover:border-[#3b82f6]/30 transition-all text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] rounded-xl flex items-center justify-center text-white mb-6 mx-auto shadow-sm group-hover:shadow-lg transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2">Je pense souffrir<br />d'apnee du sommeil</h3>
                  <p className="text-[14px] text-[#64748b]">Symptomes, diagnostic, parcours</p>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                <Link to="/contact" className="group block bg-gradient-to-br from-[#d1fae5] to-white border border-[#e2e8f0] text-[#1a2b3c] p-8 rounded-2xl hover:shadow-2xl hover:border-[#10b981]/30 transition-all text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#10b981] to-[#34d399] rounded-xl flex items-center justify-center text-white mb-6 mx-auto shadow-sm group-hover:shadow-lg transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2">Je suis deja diagnostique /<br />appareille</h3>
                  <p className="text-[14px] text-[#64748b]">Choisir votre prestataire</p>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
                <Link to="/espace-medecin" className="group block bg-gradient-to-br from-[#ede9fe] to-white border border-[#e2e8f0] text-[#1a2b3c] p-8 rounded-2xl hover:shadow-2xl hover:border-[#8b5cf6]/30 transition-all text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] rounded-xl flex items-center justify-center text-white mb-6 mx-auto shadow-sm group-hover:shadow-lg transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2">Je suis medecin /<br />professionnel de sante</h3>
                  <p className="text-[14px] text-[#64748b]">Acces plateforme medecin</p>
                </Link>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }} className="max-w-[700px] mx-auto rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/30">
              <div className="grid grid-cols-3 gap-8 text-center relative z-10">
                <div>
                  <div className="text-[32px] font-semibold bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent mb-2">100%</div>
                  <div className="text-[13px] text-[#1a2b3c] font-medium">Pris en charge</div>
                  <div className="text-[12px] text-[#64748b]">Secu + Mutuelle</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold bg-gradient-to-br from-[#10b981] to-[#34d399] bg-clip-text text-transparent mb-2">Libre</div>
                  <div className="text-[13px] text-[#1a2b3c] font-medium">Choix</div>
                  <div className="text-[12px] text-[#64748b]">Votre prestataire</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] bg-clip-text text-transparent mb-2">24/7</div>
                  <div className="text-[13px] text-[#1a2b3c] font-medium">Telesuivi</div>
                  <div className="text-[12px] text-[#64748b]">Disponible</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { value: '15 000+', label: 'Patients accompagnes', sublabel: 'depuis 2000' },
              { value: '98%', label: 'Taux de satisfaction', sublabel: 'selon enquete 2024' },
              { value: '500+', label: 'Medecins partenaires', sublabel: 'partout en France' },
            ].map((stat, index) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                <div className="text-[56px] font-semibold bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent leading-none mb-3">{stat.value}</div>
                <div className="text-[17px] text-[#1a2b3c] font-medium mb-1">{stat.label}</div>
                <div className="text-[14px] text-[#64748b]">{stat.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white">
        <div className="max-w-[800px] mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-white mb-6">Pret a retrouver un sommeil reparateur ?</h2>
            <p className="text-[19px] opacity-90 mb-12 leading-relaxed">
              Contactez-nous pour en savoir plus sur votre parcours de soin.
            </p>
            <Link to="/contact" className="inline-block bg-white text-[#3b82f6] px-10 py-4 rounded-full text-[17px] font-medium hover:shadow-2xl transition-all">
              Nous contacter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
