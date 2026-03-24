import { motion } from 'motion/react';
import { Moon, LineChart, Calendar, FileText, MessageCircle, Settings, CheckCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export function EspacePatient() {
  const { t } = useTranslation();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    { icon: <LineChart className="w-6 h-6" />, title: t('espacePatient.feature1Title'), description: t('espacePatient.feature1Desc') },
    { icon: <Calendar className="w-6 h-6" />, title: t('espacePatient.feature2Title'), description: t('espacePatient.feature2Desc') },
    { icon: <FileText className="w-6 h-6" />, title: t('espacePatient.feature3Title'), description: t('espacePatient.feature3Desc') },
    { icon: <MessageCircle className="w-6 h-6" />, title: t('espacePatient.feature4Title'), description: t('espacePatient.feature4Desc') },
    { icon: <Settings className="w-6 h-6" />, title: t('espacePatient.feature5Title'), description: t('espacePatient.feature5Desc') },
    { icon: <Moon className="w-6 h-6" />, title: t('espacePatient.feature6Title'), description: t('espacePatient.feature6Desc') },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-br from-blue-600 to-blue-400 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto text-white">
            <Moon className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h1 className="text-4xl lg:text-5xl font-light mb-4 tracking-tight">{t('espacePatient.heroTitle')}</h1>
            <p className="text-lg opacity-80 font-light">{t('espacePatient.heroSubtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espacePatient.featuresTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">{t('espacePatient.featuresSubtitle')}</p>
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-white mb-4">
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
              <h2 className="text-3xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espacePatient.autonomyTitle')}</h2>
              <p className="text-lg text-gray-500 mb-6 font-light">{t('espacePatient.autonomySubtitle')}</p>
              <ul className="space-y-3">
                {[t('espacePatient.benefit1'), t('espacePatient.benefit2'), t('espacePatient.benefit3'), t('espacePatient.benefit4'), t('espacePatient.benefit5')].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[#1a2b3c] text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl mb-6 flex items-center justify-center">
                  <LineChart className="w-16 h-16 text-blue-400" />
                </div>
                <h3 className="text-lg font-normal text-[#1a2b3c] mb-2">{t('espacePatient.secureDataTitle')}</h3>
                <p className="text-sm text-gray-500">{t('espacePatient.secureDataDesc')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Login - Split design */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espacePatient.loginTitle')}</h2>
              <p className="text-lg text-gray-500 font-light mb-8">{t('espacePatient.loginSubtitle')}</p>
              <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl p-8">
                <div className="space-y-4">
                  {[
                    { icon: '01', text: t('espacePatient.benefit1') },
                    { icon: '02', text: t('espacePatient.benefit2') },
                    { icon: '03', text: t('espacePatient.benefit4') },
                  ].map((item) => (
                    <div key={item.icon} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-medium text-blue-600 shadow-sm">{item.icon}</div>
                      <span className="text-sm text-[#1a2b3c]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <LoginForm userType="patient" redirectTo="/dashboard-patient" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="py-20 lg:py-28 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espacePatient.helpTitle')}</h2>
            <p className="text-base text-gray-500 mb-8 font-light">{t('espacePatient.helpSubtitle')}</p>
            <Link to="/contact" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
              {t('espacePatient.helpButton')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
