import { motion } from 'motion/react';
import { Moon, LineChart, Calendar, FileText, MessageCircle, Settings, CheckCircle } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { Link } from 'react-router-dom';

export function EspacePatient() {
  const fadeInUp = {
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const features = [
    {
      icon: <LineChart className="w-8 h-8" />,
      title: 'Suivi de votre traitement',
      description: 'Visualisez vos données d\'observance : heures d\'utilisation, qualité du sommeil, évolution.',
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Gestion des rendez-vous',
      description: 'Consultez vos prochaines visites techniques et points de suivi avec notre équipe.',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Documents et rapports',
      description: 'Accédez à vos compte-rendus, notices d\'utilisation et guides pratiques.',
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Messagerie sécurisée',
      description: 'Communiquez directement avec votre équipe Exp\'Air Medical en toute confidentialité.',
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: 'Paramètres et préférences',
      description: 'Gérez vos informations personnelles, vos notifications et vos préférences.',
    },
    {
      icon: <Moon className="w-8 h-8" />,
      title: 'Conseils personnalisés',
      description: 'Recevez des recommandations adaptées pour optimiser votre confort et votre observance.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto text-white"
          >
            <Moon className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-5xl lg:text-6xl mb-6">
              Espace Patient
            </h1>
            <p className="text-xl opacity-90">
              Accédez à votre tableau de bord personnel pour suivre votre traitement, 
              consulter vos données et communiquer avec votre équipe Medical.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Tout pour réussir votre traitement
            </h2>
            <p className="text-xl text-[#5C5C5C] max-w-3xl mx-auto">
              Votre espace patient vous donne accès à tous les outils nécessaires pour 
              suivre et optimiser votre traitement au quotidien.
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
                <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center text-white mb-6">
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
              <h2 className="text-4xl text-[#1A1A1A] mb-6">
                Autonomie et transparence
              </h2>
              <p className="text-xl text-[#5C5C5C] mb-6">
                Votre espace patient vous rend acteur de votre santé. Vous n'êtes plus dans le flou, 
                vous comprenez votre traitement et vous pouvez suivre vos progrès en temps réel.
              </p>
              <ul className="space-y-4">
                {[
                  'Visualisez vos données d\'observance simplement',
                  'Comprenez comment votre traitement fonctionne',
                  'Identifiez les points à améliorer',
                  'Communiquez facilement avec votre équipe',
                  'Accédez à vos documents 24/7',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[#18753C] flex-shrink-0 mt-0.5" />
                    <span className="text-[#1A1A1A] text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="aspect-video bg-gradient-to-br from-[#007AFF]/10 to-[#5AC8FA]/10 rounded-2xl mb-6 flex items-center justify-center">
                  <LineChart className="w-24 h-24 text-[#007AFF]" />
                </div>
                <h3 className="text-2xl text-[#1A1A1A] mb-3">Données sécurisées</h3>
                <p className="text-[#5C5C5C]">
                  Vos données de santé sont hébergées de manière sécurisée et conforme aux normes RGPD 
                  et HDS (Hébergeur de Données de Santé). Vous seul, votre médecin et votre équipe 
                  Medical y ont accès.
                </p>
              </div>
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
              Utilisez vos identifiants pour accéder à votre tableau de bord personnel
            </p>
          </motion.div>

          <div className="flex justify-center">
            <motion.div {...fadeInUp}>
              <LoginForm userType="patient" redirectTo="/patient/dashboard" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl text-[#1A1A1A] mb-6">
              Besoin d'aide pour vous connecter ?
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8">
              Notre équipe support est à votre disposition pour vous aider à accéder à votre espace patient.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg"
            >
              Contacter le support
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}