import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Users, BarChart3, Settings, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

export function EspaceAdmin() {
  const fadeInUp = {
    initial: false,
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
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#B34000] to-[#B34000] overflow-hidden">
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
              Tableau de bord d'administration pour gérer la plateforme Medical
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Outils d'administration
            </h2>
            <p className="text-xl text-[#5C5C5C] max-w-3xl mx-auto">
              Un tableau de bord complet pour gérer tous les aspects de la plateforme
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#F2F0EB] rounded-3xl p-8 hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#B34000] to-[#B34000] rounded-2xl flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl text-[#1A1A1A] mb-3">{feature.title}</h3>
                <p className="text-[#5C5C5C]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Login */}
      <section className="py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Connexion administrateur
            </h2>
            <p className="text-xl text-[#5C5C5C] max-w-3xl mx-auto">
              Utilisez vos identifiants d'administrateur pour accéder au tableau de bord
            </p>
          </motion.div>

          <div className="flex justify-center">
            <motion.div {...fadeInUp}>
              <LoginForm userType="admin" redirectTo="/pro/dashboard" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="bg-gradient-to-br from-[#007AFF]/10 to-[#18753C]/10 rounded-3xl p-8 lg:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#18753C] rounded-2xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl text-[#1A1A1A] mb-4">Sécurité et confidentialité</h3>
                <p className="text-[#5C5C5C] mb-4">
                  L'accès administrateur est strictement contrôlé et enregistré. 
                  Toutes les actions sont tracées pour garantir la sécurité des données patients.
                </p>
                <ul className="space-y-2 text-[#1A1A1A]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#18753C]" />
                    <span>Authentification à deux facteurs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#18753C]" />
                    <span>Journalisation de toutes les modifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#18753C]" />
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