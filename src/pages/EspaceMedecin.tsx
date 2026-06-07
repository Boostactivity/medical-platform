import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, BarChart3, FileText, Bell, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

export function EspaceMedecin() {
  const fadeInUp = {
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Suivi de vos patients',
      description: 'Accédez à la liste complète de vos patients appareillés par Exp\'Air Medical.',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Rapports d\'observance',
      description: 'Consultez les données d\'utilisation détaillées et les indicateurs clés.',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Comptes-rendus',
      description: 'Téléchargez les rapports complets pour vos dossiers médicaux.',
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Alertes personnalisées',
      description: 'Recevez des notifications en cas de problème d\'observance.',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Données sécurisées',
      description: 'Hébergement conforme HDS et respect du secret médical.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Collaboration efficace',
      description: 'Échangez directement avec l\'équipe Exp\'Air Medical de vos patients.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#18753C] to-[#145F31] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto text-white"
          >
            <Users className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-5xl lg:text-6xl mb-6">
              Espace Médecin
            </h1>
            <p className="text-xl opacity-90">
              Accédez à votre tableau de bord professionnel pour suivre vos patients appareillés 
              et collaborer efficacement avec Medical.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Un outil pensé pour les praticiens
            </h2>
            <p className="text-xl text-[#5C5C5C] max-w-3xl mx-auto">
              Gagnez du temps avec un accès centralisé aux données d'observance de vos patients 
              et une communication fluide avec Medical.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#F2F0EB] rounded-3xl p-8 hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#18753C] to-[#145F31] rounded-2xl flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl text-[#1A1A1A] mb-3">{feature.title}</h3>
                <p className="text-[#5C5C5C]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="aspect-video bg-gradient-to-br from-[#18753C]/10 to-[#18753C]/10 rounded-2xl mb-6 flex items-center justify-center">
                  <BarChart3 className="w-24 h-24 text-[#18753C]" />
                </div>
                <h3 className="text-2xl text-[#1A1A1A] mb-3">Données exploitables</h3>
                <p className="text-[#5C5C5C]">
                  Visualisez rapidement l'observance de chaque patient, identifiez les tendances 
                  et prenez des décisions cliniques éclairées grâce à des rapports clairs et synthétiques.
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <h2 className="text-4xl text-[#1A1A1A] mb-6">
                Collaboration optimisée
              </h2>
              <p className="text-xl text-[#5C5C5C] mb-6">
                Avec Medical, vous bénéficiez d'un véritable partenariat. 
                Notre équipe travaille en étroite collaboration avec vous pour garantir 
                la réussite du traitement de vos patients.
              </p>
              <ul className="space-y-4">
                {[
                  'Rapports d\'observance automatisés et réguliers',
                  'Alertes en cas de problème détecté',
                  'Communication directe avec le technicien référent',
                  'Respect de votre protocole de prescription',
                  'Feedback patient transmis systématiquement',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[#18753C] flex-shrink-0 mt-0.5" />
                    <span className="text-[#1A1A1A] text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Login */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Connectez-vous à votre espace
            </h2>
            <p className="text-xl text-[#5C5C5C] max-w-3xl mx-auto">
              Utilisez vos identifiants professionnels pour accéder à votre tableau de bord médecin
            </p>
          </motion.div>

          <div className="flex justify-center">
            <motion.div {...fadeInUp}>
              <LoginForm userType="doctor" redirectTo="/medecin/dashboard" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Register */}
      <section className="py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl text-[#1A1A1A] mb-6">
              Vous n'avez pas encore d'accès médecin ?
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8">
              Demandez la création de votre compte professionnel. Nous vérifions votre statut 
              de praticien et vous créons un accès dans les 24h.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-[#18753C] text-white rounded-full hover:bg-[#30B555] transition-all shadow-lg"
            >
              Demander un accès médecin
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}