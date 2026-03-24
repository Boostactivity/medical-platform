import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-6 pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-6xl w-full relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="text-center">
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 flex-wrap">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="text-xs text-blue-700 font-medium">{t('homepage.badgeProvider')}</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs text-emerald-700 font-medium">{t('homepage.badge247')}</span>
              </motion.div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl leading-[1.05] text-[#1a2b3c] mb-6 max-w-4xl mx-auto font-light tracking-tight">
              {t('homepage.heroTitle1')}<br />
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{t('homepage.heroTitle2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
              {t('homepage.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/contact" className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-3.5 rounded-xl text-base font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                {t('homepage.ctaButton')}
              </Link>
              <Link to="/apnee-sommeil" className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-base font-medium hover:bg-gray-50 transition-all">
                {t('homepage.card1Subtitle')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-20 lg:py-28 px-6 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { to: '/apnee-sommeil', title: t('homepage.card1Title'), subtitle: t('homepage.card1Subtitle'), gradient: 'from-blue-50 to-white', iconGradient: 'from-blue-600 to-blue-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { to: '/contact', title: t('homepage.card2Title'), subtitle: t('homepage.card2Subtitle'), gradient: 'from-emerald-50 to-white', iconGradient: 'from-emerald-600 to-emerald-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { to: '/espace-medecin', title: t('homepage.card3Title'), subtitle: t('homepage.card3Subtitle'), gradient: 'from-violet-50 to-white', iconGradient: 'from-violet-600 to-violet-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
            ].map((card, index) => (
              <motion.div key={card.to} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                <Link to={card.to} className={`group block bg-gradient-to-br ${card.gradient} bg-white border border-gray-100 p-8 rounded-2xl hover:shadow-lg hover:border-gray-200 transition-all text-center`}>
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.iconGradient} rounded-xl flex items-center justify-center text-white mb-5 mx-auto`}>
                    {card.icon}
                  </div>
                  <h3 className="text-base font-medium text-[#1a2b3c] mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.howItWorksTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">{t('homepage.howItWorksSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: '01', title: t('homepage.step1Title'), desc: t('homepage.step1Desc'), color: 'text-blue-600' },
              { num: '02', title: t('homepage.step2Title'), desc: t('homepage.step2Desc'), color: 'text-violet-600' },
              { num: '03', title: t('homepage.step3Title'), desc: t('homepage.step3Desc'), color: 'text-emerald-600' },
              { num: '04', title: t('homepage.step4Title'), desc: t('homepage.step4Desc'), color: 'text-amber-600' },
            ].map((step, index) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="text-center">
                <div className={`text-4xl font-light ${step.color} mb-4`}>{step.num}</div>
                <h3 className="text-base font-medium text-[#1a2b3c] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Patients */}
      <section className="py-20 lg:py-32 px-6 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
                <span className="text-xs text-blue-700 font-medium">{t('homepage.forPatientsTitle')}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.forPatientsTitle')}</h2>
              <p className="text-lg text-gray-500 mb-8 font-light">{t('homepage.forPatientsSubtitle')}</p>
              <ul className="space-y-4">
                {[t('homepage.patientFeature1'), t('homepage.patientFeature2'), t('homepage.patientFeature3'), t('homepage.patientFeature4')].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[#1a2b3c] text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl font-light">85</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1a2b3c]">Score de sante</div>
                    <div className="text-xs text-emerald-600">+12% cette semaine</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Observance', value: '92%', width: '92%', color: 'bg-blue-500' },
                    { label: 'Confort masque', value: '4.2/5', width: '84%', color: 'bg-violet-500' },
                    { label: 'Heures / nuit', value: '6.8h', width: '85%', color: 'bg-emerald-500' },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{m.label}</span>
                        <span className="text-xs font-medium text-[#1a2b3c]">{m.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${m.color} rounded-full`} style={{ width: m.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Doctors */}
      <section className="py-20 lg:py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-2 lg:order-1">
              <div className="bg-[#f8fafc] rounded-2xl border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-medium text-[#1a2b3c]">Patients suivis</h4>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">142 actifs</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Jean D.', status: 'Observant', hours: '7.2h', statusColor: 'bg-emerald-500' },
                    { name: 'Marie L.', status: 'Alerte', hours: '3.1h', statusColor: 'bg-amber-500' },
                    { name: 'Pierre M.', status: 'Observant', hours: '6.8h', statusColor: 'bg-emerald-500' },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${p.statusColor}`} />
                        <span className="text-sm text-[#1a2b3c]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">{p.status}</span>
                        <span className="text-xs font-medium text-[#1a2b3c]">{p.hours}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div {...fadeInUp} className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-6">
                <span className="text-xs text-emerald-700 font-medium">{t('homepage.forDoctorsTitle')}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.forDoctorsTitle')}</h2>
              <p className="text-lg text-gray-500 mb-8 font-light">{t('homepage.forDoctorsSubtitle')}</p>
              <ul className="space-y-4">
                {[t('homepage.doctorFeature1'), t('homepage.doctorFeature2'), t('homepage.doctorFeature3'), t('homepage.doctorFeature4')].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[#1a2b3c] text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Providers */}
      <section className="py-20 lg:py-32 px-6 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 mb-6">
                <span className="text-xs text-violet-700 font-medium">{t('homepage.forProvidersTitle')}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.forProvidersTitle')}</h2>
              <p className="text-lg text-gray-500 mb-8 font-light">{t('homepage.forProvidersSubtitle')}</p>
              <ul className="space-y-4">
                {[t('homepage.providerFeature1'), t('homepage.providerFeature2'), t('homepage.providerFeature3'), t('homepage.providerFeature4')].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[#1a2b3c] text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Parc actif', value: '1,247', change: '+8%' },
                    { label: 'Observance moy.', value: '87%', change: '+3%' },
                    { label: 'Interventions/mois', value: '312', change: '-12%' },
                    { label: 'ROI annuel', value: '+24%', change: '' },
                  ].map((m) => (
                    <div key={m.label} className="bg-[#f8fafc] rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                      <div className="text-xl font-medium text-[#1a2b3c]">{m.value}</div>
                      {m.change && <div className="text-xs text-emerald-600 mt-1">{m.change}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 lg:py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.statsTitle')}</h2>
            <p className="text-lg text-gray-500 font-light">{t('homepage.statsSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: t('homepage.stat1Value'), label: t('homepage.stat1Label'), sub: t('homepage.stat1Sub') },
              { value: t('homepage.stat2Value'), label: t('homepage.stat2Label'), sub: t('homepage.stat2Sub') },
              { value: t('homepage.stat3Value'), label: t('homepage.stat3Label'), sub: t('homepage.stat3Sub') },
              { value: t('homepage.stat4Value'), label: t('homepage.stat4Label'), sub: t('homepage.stat4Sub') },
            ].map((stat, index) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                <div className="text-4xl md:text-5xl font-light bg-gradient-to-br from-blue-600 to-violet-600 bg-clip-text text-transparent leading-none mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-[#1a2b3c] mb-1">{stat.label}</div>
                <div className="text-xs text-gray-500">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32 px-6 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.testimonialsTitle')}</h2>
            <p className="text-lg text-gray-500 font-light">{t('homepage.testimonialsSubtitle')}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: t('homepage.testimonial1'), author: t('homepage.testimonial1Author'), role: t('homepage.testimonial1Role') },
              { text: t('homepage.testimonial2'), author: t('homepage.testimonial2Author'), role: t('homepage.testimonial2Role') },
              { text: t('homepage.testimonial3'), author: t('homepage.testimonial3Author'), role: t('homepage.testimonial3Role') },
            ].map((testimonial, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                <div className="text-blue-600 mb-4">
                  <svg className="w-8 h-8 opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">{testimonial.text}</p>
                <div>
                  <div className="text-sm font-medium text-[#1a2b3c]">{testimonial.author}</div>
                  <div className="text-xs text-gray-500">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Connectors */}
      <section className="py-20 lg:py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.connectorsTitle')}</h2>
            <p className="text-lg text-gray-500 font-light mb-12">{t('homepage.connectorsSubtitle')}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {['ResMed', 'Philips', 'Fisher & Paykel', 'Lowenstein', 'SomnoMed', 'Weinmann'].map((brand) => (
              <div key={brand} className="text-xl md:text-2xl font-light text-gray-300 tracking-wide">{brand}</div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-20 lg:py-32 px-6 bg-gradient-to-br from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight">{t('homepage.demoCtaTitle')}</h2>
            <p className="text-lg text-white/80 mb-10 font-light">{t('homepage.demoCtaSubtitle')}</p>
            <Link to="/contact" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl text-base font-medium hover:shadow-xl transition-all">
              {t('homepage.demoCtaButton')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('homepage.ctaTitle')}</h2>
            <p className="text-lg text-gray-500 mb-10 font-light">{t('homepage.ctaSubtitle')}</p>
            <Link to="/contact" className="inline-block bg-gradient-to-r from-blue-600 to-violet-600 text-white px-10 py-4 rounded-xl text-base font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
              {t('homepage.ctaButton')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
