import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Moon, Heart, Brain, Activity, CheckCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export function ApneeSommeil() {
  const { t } = useTranslation();
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const symptoms = [
    'Fatigue intense dès le réveil',
    'Somnolence excessive dans la journée',
    'Ronflements bruyants',
    'Pauses respiratoires observées',
    'Maux de tête matinaux',
    'Difficultés de concentration',
    'Irritabilité et troubles de l\'humeur',
    'Réveils nocturnes fréquents',
    'Sensation d\'étouffement la nuit',
    'Endormissements involontaires',
  ];

  const risks = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Risques cardiovasculaires',
      description: 'Hypertension artérielle, troubles du rythme cardiaque, insuffisance cardiaque, AVC.',
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Troubles cognitifs',
      description: 'Baisse de concentration, troubles de la mémoire, difficultés d\'apprentissage.',
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: 'Risques métaboliques',
      description: 'Diabète de type 2, prise de poids, syndrome métabolique.',
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: 'Accidents',
      description: 'Risque multiplié d\'accidents de la route et du travail par somnolence.',
    },
  ];

  return (
    <div className="bg-white dark:bg-background">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-blue-600/10 px-4 py-2 rounded-full mb-6">
              <Moon className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600">Comprendre l'apnée du sommeil</span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
              Qu'est-ce que l'apnée du sommeil ?
            </h1>
            <p className="text-xl text-gray-500 dark:text-muted-foreground">
              Le syndrome d'apnées-hypopnées obstructives du sommeil (SAHOS) est un trouble respiratoire 
              nocturne fréquent et sous-diagnostiqué qui peut avoir des conséquences importantes sur votre santé.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is it */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <h2 className="text-4xl text-[#1a2b3c] dark:text-foreground mb-6">Un trouble respiratoire nocturne</h2>
              <p className="text-lg text-gray-500 dark:text-muted-foreground mb-4">
                L'apnée du sommeil se caractérise par des pauses respiratoires répétées pendant le sommeil. 
                Ces pauses, appelées "apnées", sont causées par un relâchement des muscles des voies aériennes supérieures.
              </p>
              <p className="text-lg text-gray-500 dark:text-muted-foreground mb-4">
                Lorsque les voies respiratoires se ferment partiellement ou complètement, l'air ne peut plus passer normalement. 
                Le cerveau détecte ce manque d'oxygène et provoque un micro-réveil pour rétablir la respiration.
              </p>
              <p className="text-lg text-gray-500 dark:text-muted-foreground mb-6">
                Ces micro-réveils fragmentent le sommeil sans que vous en ayez conscience, 
                empêchant votre organisme de bénéficier d'un repos réparateur.
              </p>
              <div className="bg-[#f8fafc] dark:bg-secondary rounded-2xl p-6">
                <h4 className="text-[#1a2b3c] dark:text-foreground mb-3">Classification de la sévérité</h4>
                <div className="space-y-2 text-gray-500 dark:text-muted-foreground">
                  <div><strong className="text-[#1a2b3c] dark:text-foreground">Légère :</strong> 5 à 15 apnées par heure</div>
                  <div><strong className="text-[#1a2b3c] dark:text-foreground">Modérée :</strong> 15 à 30 apnées par heure</div>
                  <div><strong className="text-[#1a2b3c] dark:text-foreground">Sévère :</strong> Plus de 30 apnées par heure</div>
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeInUp} className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1759176171049-9b4f451506d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbGVlcCUyMHF1YWxpdHklMjBuaWdodHxlbnwxfHx8fDE3NjQ2OTIxOTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Sommeil de qualité"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Symptoms */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl text-[#1a2b3c] dark:text-foreground mb-6">
              Quels sont les symptômes ?
            </h2>
            <p className="text-lg text-gray-500 dark:text-muted-foreground max-w-3xl mx-auto">
              Reconnaître les signes de l'apnée du sommeil est la première étape vers un diagnostic et un traitement.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {symptoms.map((symptom, index) => (
              <motion.div
                key={symptom}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl p-4 shadow-sm"
              >
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-[#1a2b3c] dark:text-foreground">{symptom}</span>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="text-center">
            <div className="bg-[#FF9500]/10 border-2 border-[#FF9500]/30 rounded-2xl p-8 max-w-3xl mx-auto">
              <AlertTriangle className="w-12 h-12 text-[#FF9500] mx-auto mb-4" />
              <h4 className="text-xl text-[#1a2b3c] dark:text-foreground mb-3">Vous vous reconnaissez ?</h4>
              <p className="text-gray-500 dark:text-muted-foreground mb-6">
                Si vous présentez plusieurs de ces symptômes, nous vous recommandons de consulter un médecin. 
                Le diagnostic précoce permet d'éviter les complications et d'améliorer rapidement votre qualité de vie.
              </p>
              <Link
                to="/contact"
                className="inline-block px-8 py-3 bg-[#FF9500] text-white rounded-full hover:bg-[#E08600] transition-all"
              >
                Faire le point sur mes symptômes
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Risks */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl text-[#1a2b3c] dark:text-foreground mb-6">
              Pourquoi se faire traiter ?
            </h2>
            <p className="text-lg text-gray-500 dark:text-muted-foreground max-w-3xl mx-auto">
              Non traitée, l'apnée du sommeil peut entraîner de sérieuses complications 
              pour votre santé et votre sécurité.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {risks.map((risk, index) => (
              <motion.div
                key={risk.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#f8fafc] dark:bg-secondary rounded-3xl p-8"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#FF3B30] to-[#FF9500] rounded-2xl flex items-center justify-center text-white mb-6">
                  {risk.icon}
                </div>
                <h3 className="text-2xl text-[#1a2b3c] dark:text-foreground mb-3">{risk.title}</h3>
                <p className="text-gray-500 dark:text-muted-foreground">{risk.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="bg-gradient-to-br from-[#10b981]/10 to-[#30D158]/10 border-2 border-[#10b981]/30 rounded-3xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h3 className="text-3xl text-[#1a2b3c] dark:text-foreground mb-4">La bonne nouvelle</h3>
            <p className="text-xl text-gray-500 dark:text-muted-foreground max-w-2xl mx-auto mb-6">
              L'apnée du sommeil se traite efficacement. Le traitement par PPC (Pression Positive Continue) 
              permet de réduire drastiquement les apnées, d'améliorer la qualité du sommeil et de diminuer 
              significativement les risques de complications.
            </p>
            <p className="text-lg text-gray-500 dark:text-muted-foreground max-w-2xl mx-auto">
              De nombreux patients constatent une amélioration dès les premières nuits de traitement : 
              meilleur réveil, plus d'énergie, meilleure humeur et concentration.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl lg:text-4xl text-[#1a2b3c] dark:text-foreground mb-6">
              Prochaine étape : le diagnostic
            </h2>
            <p className="text-lg text-gray-500 dark:text-muted-foreground mb-8">
              Découvrez comment se déroule le parcours diagnostic en France et comment 
              la plateforme peut vous accompagner dès le début.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/parcours-diagnostic"
                className="px-8 py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
              >
                Comprendre le diagnostic
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-full hover:bg-[#f8fafc] dark:bg-secondary transition-all"
              >
                Être accompagné
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}