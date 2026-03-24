import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Stethoscope, FileText, UserCheck, ArrowRight, CheckCircle } from 'lucide-react';
import medicalImage from 'figma:asset/0e94221a81654bf7b01878dccb715d050a3cff3e.png';
import prescriptionImage from 'figma:asset/e11fbfd392f7cbc7109c8e8816b16994a192f985.png';
import sleepTestImage from 'figma:asset/4719bb1bca27dc5d36d99455785e274b8017ad42.png';
import diagnosisImage from 'figma:asset/5d59416a49ff0951f1d511521ecb04c71d42cc39.png';

export function ParcoursDiagnostic() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const steps = [
    {
      icon: <ClipboardCheck className="w-10 h-10" />,
      title: 'Questionnaire et consultation',
      description: 'Vous identifiez des symptômes : fatigue, ronflements, somnolence...',
      details: [
        'Réalisez notre questionnaire en ligne gratuit',
        'Consultez votre médecin traitant ou un spécialiste',
        'Possibilité de téléconsultation avec nos partenaires',
      ],
      color: 'from-[#3b82f6] to-[#5AC8FA]',
    },
    {
      icon: <Stethoscope className="w-10 h-10" />,
      title: 'Prescription du test',
      description: 'Le médecin évalue vos symptômes et prescrit un examen du sommeil',
      details: [
        'Polygraphie ventilatoire à domicile (la plus courante)',
        'Ou polysomnographie en centre du sommeil',
        'Examen médical prescrit = pris en charge par la Sécurité sociale',
      ],
      color: 'from-[#5AC8FA] to-[#10b981]',
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: 'Réalisation du test',
      description: 'Vous effectuez le test dans le confort de votre domicile ou en centre',
      details: [
        'Appareil léger et simple à installer',
        'Une nuit de sommeil avec capteurs',
        'Enregistrement des paramètres respiratoires',
      ],
      color: 'from-[#10b981] to-[#FF9500]',
    },
    {
      icon: <UserCheck className="w-10 h-10" />,
      title: 'Diagnostic et traitement',
      description: 'Le médecin analyse les résultats et propose un traitement adapté',
      details: [
        'Consultation de restitution des résultats',
        'Si apnée modérée/sévère : prescription de PPC',
        'Vous choisissez librement votre prestataire',
      ],
      color: 'from-[#FF9500] to-[#3b82f6]',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#3b82f6] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-[#3b82f6]/10 px-4 py-2 rounded-full mb-6">
              <FileText className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-[#3b82f6]">Parcours diagnostic</span>
            </div>
            <h1 className="text-5xl lg:text-6xl text-[#1a2b3c] mb-6">
              Comment se déroule le diagnostic en France ?
            </h1>
            <p className="text-xl text-[#6b7280]">
              De la suspicion d'apnée du sommeil jusqu'à la mise en place du traitement, 
              voici les étapes clés de votre parcours médical en France.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl`}>
                      {step.icon}
                    </div>
                    <div className="text-6xl text-[#3b82f6]/10 mb-4">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <h2 className="text-3xl lg:text-4xl text-[#1a2b3c] mb-4">{step.title}</h2>
                    <p className="text-xl text-[#6b7280] mb-6">{step.description}</p>
                    <ul className="space-y-3">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-[#10b981] flex-shrink-0 mt-0.5" />
                          <span className="text-[#1a2b3c]">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                    {index === 0 ? (
                      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                        <img 
                          src={medicalImage} 
                          alt="Consultation médicale - Questionnaire en ligne" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : index === 1 ? (
                      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                        <img 
                          src={prescriptionImage} 
                          alt="Médecin remettant une prescription médicale" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : index === 2 ? (
                      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                        <img 
                          src={sleepTestImage} 
                          alt="Réalisation du test du sommeil" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : index === 3 ? (
                      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                        <img 
                          src={diagnosisImage} 
                          alt="Analyse des résultats du test du sommeil" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#f8fafc] to-white flex items-center justify-center">
                        <div className={`w-2/3 h-2/3 bg-gradient-to-br ${step.color} rounded-full opacity-20`}></div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Info */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div {...fadeInUp} className="bg-white rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl text-[#1a2b3c] mb-4">Prise en charge financière</h3>
              <p className="text-[#6b7280] mb-4">
                En France, le test du sommeil prescrit par un médecin est un examen médical 
                remboursé par la Sécurité sociale (à 60%) et complété par votre mutuelle.
              </p>
              <p className="text-[#6b7280]">
                <strong className="text-[#1a2b3c]">Important :</strong> Vous n'avez pas à acheter un "pack diagnostic" 
                comme dans certains pays. Le parcours médical français garantit une prise en charge.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="bg-gradient-to-br from-[#3b82f6] to-[#5AC8FA] rounded-3xl p-8 text-white shadow-lg">
              <h3 className="text-2xl mb-4">Libre choix du prestataire</h3>
              <p className="mb-4">
                Une fois le diagnostic posé et la PPC prescrite, vous avez le droit légal de choisir 
                votre prestataire de santé à domicile.
              </p>
              <p className="mb-6">
                Même si votre médecin vous en recommande un, vous pouvez demander à être suivi par 
                la plateforme. Nous vous fournissons un document explicatif pour votre médecin.
              </p>
              <Link
                to="/pourquoi-expair"
                className="inline-flex items-center text-white hover:text-[#f8fafc] transition-colors"
              >
                Pourquoi choisir la plateforme
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* la plateforme Accompagnement */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">
              la plateforme vous accompagne dès le début
            </h2>
            <p className="text-xl text-[#6b7280] max-w-3xl mx-auto">
              Vous n'avez pas à attendre d'avoir une prescription de PPC pour nous contacter. 
              Nous pouvons vous guider dès les premiers symptômes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Avant le diagnostic',
                items: [
                  'Questionnaire en ligne',
                  'Information sur la démarche',
                  'Orientation vers un médecin',
                ],
              },
              {
                title: 'Pendant le diagnostic',
                items: [
                  'Explication du test',
                  'Suivi de votre parcours',
                  'Réponses à vos questions',
                ],
              },
              {
                title: 'Après le diagnostic',
                items: [
                  'Choix du prestataire',
                  'Installation rapide',
                  'Accompagnement au quotidien',
                ],
              },
            ].map((phase, index) => (
              <motion.div
                key={phase.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#f8fafc] rounded-3xl p-8"
              >
                <h3 className="text-xl text-[#1a2b3c] mb-6">{phase.title}</h3>
                <ul className="space-y-3">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
                      <span className="text-[#6b7280]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">
              Prêt à commencer votre parcours ?
            </h2>
            <p className="text-xl text-[#6b7280] mb-8">
              Contactez-nous pour un premier échange gratuit, que vous soyez au début 
              de votre réflexion ou déjà diagnostiqué.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="px-8 py-4 bg-[#3b82f6] text-white rounded-full hover:bg-[#2563eb] transition-all shadow-lg"
              >
                Prendre contact
              </Link>
              <Link
                to="/traitement-ppc"
                className="px-8 py-4 bg-white border-2 border-[#3b82f6] text-[#3b82f6] rounded-full hover:bg-[#f8fafc] transition-all"
              >
                En savoir plus sur le traitement
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}