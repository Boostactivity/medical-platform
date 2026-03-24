import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, BarChart3, FileText, Bell, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { useTranslation } from '../hooks/useTranslation';

export function EspaceMedecin() {
  const { t } = useTranslation();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    { icon: <FileText className="w-6 h-6" />, title: t('espaceMedecin.feature1Title'), description: t('espaceMedecin.feature1Desc') },
    { icon: <BarChart3 className="w-6 h-6" />, title: t('espaceMedecin.feature2Title'), description: t('espaceMedecin.feature2Desc') },
    { icon: <FileText className="w-6 h-6" />, title: t('espaceMedecin.feature3Title'), description: t('espaceMedecin.feature3Desc') },
    { icon: <Bell className="w-6 h-6" />, title: t('espaceMedecin.feature4Title'), description: t('espaceMedecin.feature4Desc') },
    { icon: <Shield className="w-6 h-6" />, title: t('espaceMedecin.feature5Title'), description: t('espaceMedecin.feature5Desc') },
    { icon: <Users className="w-6 h-6" />, title: t('espaceMedecin.feature6Title'), description: t('espaceMedecin.feature6Desc') },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-br from-emerald-600 to-emerald-400 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto text-white">
            <Users className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-light mb-4 tracking-tight">{t('espaceMedecin.heroTitle')}</h1>
            <p className="text-lg opacity-80 font-light">{t('espaceMedecin.heroSubtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceMedecin.featuresTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">{t('espaceMedecin.featuresSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-400 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-medium text-[#1a2b3c] mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="aspect-video bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl mb-6 flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-emerald-400" />
                </div>
                <h3 className="text-lg font-normal text-[#1a2b3c] mb-2">Donnees exploitables</h3>
                <p className="text-sm text-gray-500">
                  Visualisez rapidement l'observance de chaque patient et prenez des decisions cliniques eclairees.
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <h2 className="text-3xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceMedecin.collaborationTitle')}</h2>
              <p className="text-lg text-gray-500 mb-6 font-light">{t('espaceMedecin.collaborationSubtitle')}</p>
              <ul className="space-y-3">
                {[t('espaceMedecin.collab1'), t('espaceMedecin.collab2'), t('espaceMedecin.collab3'), t('espaceMedecin.collab4'), t('espaceMedecin.collab5')].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[#1a2b3c] text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Login - Split design */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div {...fadeInUp}>
              <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceMedecin.loginTitle')}</h2>
              <p className="text-lg text-gray-500 font-light mb-8">{t('espaceMedecin.loginSubtitle')}</p>

              {/* Auth Fix Banner */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-amber-700 mb-1">Probleme d'authentification ?</h3>
                    <p className="text-xs text-amber-600 mb-3">
                      Si vous rencontrez des erreurs de type "Forbidden", consultez notre guide de resolution.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/faq" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all">
                        Guide complet
                      </Link>
                      <Link to="/contact" className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-all">
                        Solution rapide
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8">
                <div className="space-y-4">
                  {[
                    { icon: '01', text: t('espaceMedecin.collab1') },
                    { icon: '02', text: t('espaceMedecin.collab2') },
                    { icon: '03', text: t('espaceMedecin.collab3') },
                  ].map((item) => (
                    <div key={item.icon} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-medium text-emerald-600 shadow-sm">{item.icon}</div>
                      <span className="text-sm text-[#1a2b3c]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <LoginForm userType="doctor" redirectTo="/dashboard-medecin" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Register */}
      <section className="py-20 lg:py-28 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceMedecin.registerTitle')}</h2>
            <p className="text-base text-gray-500 mb-8 font-light">{t('espaceMedecin.registerSubtitle')}</p>
            <Link to="/contact" className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-400 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all">
              {t('espaceMedecin.registerButton')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
