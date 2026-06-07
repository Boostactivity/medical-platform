/**
 * Page Parcours diagnostic — refondue sur le template PathologyLayout.
 * Contenu médical existant conservé (4 étapes + images figma:asset),
 * réorganisé en sections Les étapes / Prise en charge / Accompagnement.
 */

import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ClipboardCheck,
  Stethoscope,
  FileText,
  UserCheck,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { PathologyLayout, fadeInUp } from '../components/vitrine/PathologyLayout';
import medicalImage from 'figma:asset/0e94221a81654bf7b01878dccb715d050a3cff3e.png';
import prescriptionImage from 'figma:asset/e11fbfd392f7cbc7109c8e8816b16994a192f985.png';
import sleepTestImage from 'figma:asset/4719bb1bca27dc5d36d99455785e274b8017ad42.png';
import diagnosisImage from 'figma:asset/5d59416a49ff0951f1d511521ecb04c71d42cc39.png';

const steps = [
  {
    icon: <ClipboardCheck className="w-6 h-6" />,
    title: 'Questionnaire et consultation',
    description:
      'Vous remarquez des symptômes : fatigue, ronflements, somnolence...',
    details: [
      'Réalisez notre questionnaire en ligne gratuit',
      'Consultez votre médecin traitant ou un spécialiste',
      'Possibilité de téléconsultation avec nos partenaires',
    ],
    image: medicalImage,
    imageAlt: 'Consultation médicale - Questionnaire en ligne',
  },
  {
    icon: <Stethoscope className="w-6 h-6" />,
    title: 'Prescription du test',
    description:
      'Le médecin évalue vos symptômes et prescrit un examen du sommeil.',
    details: [
      'Polygraphie à domicile (un petit appareil porté une nuit chez vous) : la plus courante',
      'Ou polysomnographie (un examen plus complet) en centre du sommeil',
      'Examen prescrit par un médecin = pris en charge par la Sécurité sociale',
    ],
    image: prescriptionImage,
    imageAlt: 'Médecin remettant une prescription médicale',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Réalisation du test',
    description:
      'Vous faites le test dans le confort de votre domicile, ou en centre.',
    details: [
      'Appareil léger et simple à installer',
      'Une nuit de sommeil avec des capteurs',
      'Votre respiration est enregistrée pendant la nuit',
    ],
    image: sleepTestImage,
    imageAlt: 'Réalisation du test du sommeil',
  },
  {
    icon: <UserCheck className="w-6 h-6" />,
    title: 'Diagnostic et traitement',
    description:
      'Le médecin analyse les résultats et vous propose un traitement adapté.',
    details: [
      'Consultation pour vous expliquer les résultats',
      'Si apnée modérée ou sévère : prescription de PPC (un appareil qui envoie de l\'air en douceur pendant votre sommeil)',
      'Vous choisissez librement votre prestataire',
    ],
    image: diagnosisImage,
    imageAlt: 'Analyse des résultats du test du sommeil',
  },
];

const phases = [
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
    items: ['Explication du test', 'Suivi de votre parcours', 'Réponses à vos questions'],
  },
  {
    title: 'Après le diagnostic',
    items: ['Choix du prestataire', 'Installation rapide', 'Accompagnement au quotidien'],
  },
];

export function ParcoursDiagnostic() {
  return (
    <PathologyLayout
      badgeIcon={FileText}
      badgeLabel="Parcours diagnostic"
      title="Comment se déroule le diagnostic en France ?"
      intro="De la suspicion d'apnée du sommeil jusqu'à la mise en place du traitement, voici les étapes clés de votre parcours médical en France."
      sections={[
        {
          id: 'etapes',
          label: 'Les 4 étapes',
          title: 'Les 4 étapes de votre parcours',
          content: (
            <div className="space-y-16 lg:space-y-20 max-w-6xl mx-auto">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
                    <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                          {step.icon}
                        </div>
                        <span className="text-sm text-[#5C5C5C]">Étape {index + 1} sur 4</span>
                      </div>
                      <h3 className="text-2xl lg:text-3xl text-[#1A1A1A] mb-3">{step.title}</h3>
                      <p className="text-lg text-[#5C5C5C] mb-6 leading-relaxed">
                        {step.description}
                      </p>
                      <ul className="space-y-3">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-1" />
                            <span className="text-[#1A1A1A] leading-relaxed">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#E8E5DE] shadow-sm">
                        <img
                          src={step.image}
                          alt={step.imageAlt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ),
        },
        {
          id: 'prise-en-charge',
          label: 'Prise en charge',
          title: 'Prise en charge et libre choix',
          content: (
            <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
              <motion.div
                {...fadeInUp}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-8"
              >
                <h3 className="text-xl text-[#1A1A1A] font-medium mb-4">
                  Prise en charge financière
                </h3>
                <p className="text-[#5C5C5C] mb-4 leading-relaxed">
                  En France, le test du sommeil prescrit par un médecin est un examen
                  médical remboursé par la Sécurité sociale (à 60 %) et complété par
                  votre mutuelle.
                </p>
                <p className="text-[#5C5C5C] leading-relaxed">
                  <strong className="text-[#1A1A1A]">Important :</strong> vous n'avez
                  pas à acheter un « pack diagnostic » comme dans certains pays. Le
                  parcours médical français garantit une prise en charge.
                </p>
              </motion.div>

              <motion.div
                {...fadeInUp}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-8"
              >
                <h3 className="text-xl text-[#1A1A1A] font-medium mb-4">
                  Libre choix du prestataire
                </h3>
                <p className="text-[#5C5C5C] mb-4 leading-relaxed">
                  Une fois le diagnostic posé et la PPC prescrite, la loi vous donne
                  le droit de choisir votre prestataire de santé à domicile.
                </p>
                <p className="text-[#5C5C5C] mb-6 leading-relaxed">
                  Même si votre médecin vous en recommande un, vous pouvez demander à
                  être suivi par Medical. Nous vous fournissons un document explicatif
                  pour votre médecin.
                </p>
                <Link
                  to="/pourquoi-medical"
                  className="inline-flex items-center text-[#007AFF] hover:text-[#0051D5] transition-colors"
                >
                  Pourquoi choisir Medical
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          ),
        },
        {
          id: 'accompagnement',
          label: 'Accompagnement',
          title: 'Nous vous accompagnons dès le début',
          intro:
            "Vous n'avez pas besoin d'attendre une prescription de PPC pour nous contacter. Nous pouvons vous guider dès les premiers symptômes.",
          content: (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {phases.map((phase, index) => (
                <motion.div
                  key={phase.title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white border border-[#E8E5DE] rounded-2xl p-7"
                >
                  <h3 className="text-lg text-[#1A1A1A] font-medium mb-5">{phase.title}</h3>
                  <ul className="space-y-3">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                        <span className="text-[#5C5C5C]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          ),
        },
      ]}
      faq={[
        {
          question: 'Combien de temps dure le parcours diagnostic ?',
          answer:
            "Cela dépend des délais de consultation dans votre région. En général, comptez quelques semaines entre la première consultation et les résultats du test. Nous pouvons vous aider à vous orienter pour gagner du temps.",
        },
        {
          question: 'Le test à domicile est-il fiable ?',
          answer:
            "Oui. La polygraphie à domicile est l'examen le plus courant pour diagnostiquer l'apnée du sommeil. Si les résultats demandent un examen plus poussé, le médecin peut prescrire une polysomnographie en centre du sommeil.",
        },
        {
          question: 'Qui pose le diagnostic ?',
          answer:
            "Toujours un médecin. Notre rôle de prestataire commence après : nous installons l'appareil prescrit et nous assurons votre suivi au quotidien, en lien avec votre médecin.",
        },
      ]}
      cta={{
        title: 'Prêt à commencer votre parcours ?',
        text: 'Contactez-nous pour un premier échange gratuit, que vous soyez au début de votre réflexion ou déjà diagnostiqué.',
        primary: { label: 'Prendre contact', to: '/contact' },
        secondary: { label: 'En savoir plus sur le traitement', to: '/traitement-ppc' },
      }}
    />
  );
}
