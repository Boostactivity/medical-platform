import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Users, BarChart3, Settings, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

export function EspaceAdmin() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Gestion des utilisateurs',
      description: 'Accédez à la liste complète des patients, médecins et autres administrateurs.',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Statistiques globales',
      description: 'Visualisez les données agrégées et les indicateurs de performance.',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Rapports système',
      description: 'Générez et exportez des rapports détaillés sur l\'activité de la plateforme.',
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: 'Configuration',
      description: 'Gérez les paramètres système et les autorisations.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#FF9500] to-[#FF6B00] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto text-white"
          >
            <Shield className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-5xl lg:text-6xl mb-6">
              Espace Administrateur
            </h1>
            <p className="text-xl opacity-90">
              Tableau de bord d'administration pour gérer la plateforme
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Outils d'administration
            </h2>
            <p className="text-xl text-[#86868B] max-w-3xl mx-auto">
              Un tableau de bord complet pour gérer tous les aspects de la plateforme
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#F5F5F7] rounded-3xl p-8 hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#FF9500] to-[#FF6B00] rounded-2xl flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl text-[#1D1D1F] mb-3">{feature.title}</h3>
                <p className="text-[#86868B]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Login */}
      <section className="py-24 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Connexion administrateur
            </h2>
            <p className="text-xl text-[#86868B] max-w-3xl mx-auto">
              Utilisez vos identifiants d'administrateur pour accéder au tableau de bord
            </p>
          </motion.div>

          {/* Auth Fix Banner */}
          <motion.div 
            {...fadeInUp}
            className="mb-8 max-w-2xl mx-auto"
          >
            <div className="bg-[#007AFF]/10 border-2 border-[#007AFF] rounded-3xl p-6 mb-4">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#007AFF] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg text-[#007AFF] mb-2">✨ Instructions de connexion</h3>
                  <div className="text-[#1D1D1F] space-y-2">
                    <p><strong>1.</strong> Utilisez les identifiants de démonstration ci-dessous</p>
                    <p><strong>2.</strong> Email : <code className="bg-white px-2 py-1 rounded">admin@demo.fr</code></p>
                    <p><strong>3.</strong> Mot de passe : <code className="bg-white px-2 py-1 rounded">Test-123</code></p>
                    <p className="text-sm text-[#86868B] mt-4">
                      <strong>Première visite ?</strong> Cliquez sur "Initialiser" dans le formulaire ci-dessous pour créer les comptes de démonstration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#FF9500]/10 border-2 border-[#FF9500] rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#FF9500] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg text-[#FF9500] mb-2">⚠️ Problème d'authentification ?</h3>
                  <p className="text-[#1D1D1F] mb-4">
                    Si vous rencontrez des erreurs d'autorisation, 
                    cliquez ci-dessous pour réparer automatiquement les métadonnées de votre compte.
                  </p>
                  <Link
                    to="/fix-auth"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9500] text-white rounded-full hover:bg-[#E68A00] transition-all shadow-lg"
                  >
                    🔧 Réparer l'authentification
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-center">
            <motion.div {...fadeInUp}>
              <LoginForm userType="admin" redirectTo="/dashboard-admin" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="bg-gradient-to-br from-[#007AFF]/10 to-[#34C759]/10 rounded-3xl p-8 lg:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#34C759] rounded-2xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl text-[#1D1D1F] mb-4">Sécurité et confidentialité</h3>
                <p className="text-[#86868B] mb-4">
                  L'accès administrateur est strictement contrôlé et enregistré. 
                  Toutes les actions sont tracées pour garantir la sécurité des données patients.
                </p>
                <ul className="space-y-2 text-[#1D1D1F]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#34C759]" />
                    <span>Authentification à deux facteurs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#34C759]" />
                    <span>Journalisation de toutes les modifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#34C759]" />
                    <span>Conformité RGPD et HDS</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}