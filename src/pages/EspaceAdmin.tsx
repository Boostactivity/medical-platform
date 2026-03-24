import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Users, BarChart3, Settings, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { useTranslation } from '../hooks/useTranslation';

export function EspaceAdmin() {
  const { t } = useTranslation();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    { icon: <Users className="w-6 h-6" />, title: t('espaceAdmin.feature1Title'), description: t('espaceAdmin.feature1Desc') },
    { icon: <BarChart3 className="w-6 h-6" />, title: t('espaceAdmin.feature2Title'), description: t('espaceAdmin.feature2Desc') },
    { icon: <FileText className="w-6 h-6" />, title: t('espaceAdmin.feature3Title'), description: t('espaceAdmin.feature3Desc') },
    { icon: <Settings className="w-6 h-6" />, title: t('espaceAdmin.feature4Title'), description: t('espaceAdmin.feature4Desc') },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-br from-amber-500 to-orange-500 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto text-white">
            <Shield className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h1 className="text-4xl lg:text-5xl font-light mb-4 tracking-tight">{t('espaceAdmin.heroTitle')}</h1>
            <p className="text-lg opacity-80 font-light">{t('espaceAdmin.heroSubtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceAdmin.featuresTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">{t('espaceAdmin.featuresSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-medium text-[#1a2b3c] mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Login - Split design */}
      <section className="py-20 lg:py-28 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div {...fadeInUp}>
              <h2 className="text-3xl lg:text-4xl font-light text-[#1a2b3c] mb-4 tracking-tight">{t('espaceAdmin.loginTitle')}</h2>
              <p className="text-lg text-gray-500 font-light mb-8">{t('espaceAdmin.loginSubtitle')}</p>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">Instructions de connexion</h3>
                    <div className="text-xs text-blue-600 space-y-1">
                      <p><strong>1.</strong> Utilisez les identifiants de demonstration ci-dessous</p>
                      <p><strong>2.</strong> Email : <code className="bg-white px-2 py-0.5 rounded text-blue-700">admin@demo.fr</code></p>
                      <p><strong>3.</strong> Mot de passe : <code className="bg-white px-2 py-0.5 rounded text-blue-700">Test-123</code></p>
                      <p className="text-blue-400 mt-2">
                        <strong>Premiere visite ?</strong> Cliquez sur "Initialiser" dans le formulaire.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auth Fix Banner */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-amber-700 mb-1">Probleme d'authentification ?</h3>
                    <p className="text-xs text-amber-600 mb-3">
                      Cliquez ci-dessous pour reparer automatiquement les metadonnees de votre compte.
                    </p>
                    <Link to="/contact" className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-all">
                      Reparer l'authentification
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <LoginForm userType="admin" redirectTo="/dashboard-admin" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div {...fadeInUp} className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-gray-100 rounded-2xl p-8 lg:p-10">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-light text-[#1a2b3c] mb-3">{t('espaceAdmin.securityTitle')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('espaceAdmin.securityDesc')}</p>
                <ul className="space-y-2">
                  {[t('espaceAdmin.security1'), t('espaceAdmin.security2'), t('espaceAdmin.security3')].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-[#1a2b3c]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
