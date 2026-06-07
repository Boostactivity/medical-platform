import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const fadeInUp = {
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const faqsPatients = [
    {
      question: 'Combien coûte le traitement par PPC ?',
      answer: 'En France, le traitement par PPC est pris en charge par l\'Assurance Maladie (60%) et votre mutuelle (généralement 40%). Dans la grande majorité des cas, vous n\'avez rien à payer. Le système fonctionne par location mensuelle de l\'appareil, incluant le suivi et les accessoires.',
    },
    {
      question: 'Est-ce que le test du sommeil est payant ?',
      answer: 'Le test du sommeil prescrit par un médecin est un examen médical remboursé par la Sécurité sociale et votre mutuelle. Contrairement à certains pays où il faut acheter un "pack diagnostic", en France le parcours médical garantit une prise en charge.',
    },
    {
      question: 'Puis-je choisir mon prestataire ?',
      answer: 'Oui, absolument ! En France, la loi vous garantit le libre choix de votre prestataire de santé à domicile. Même si votre médecin vous recommande un prestataire, vous avez le droit de choisir Exp\'Air Medical. Nous vous fournissons un document explicatif pour votre médecin.',
    },
    {
      question: 'Le traitement PPC est-il douloureux ?',
      answer: 'Non, le traitement par PPC n\'est pas douloureux. Il peut y avoir une période d\'adaptation les premiers jours (sensation d\'air, port du masque), mais notre équipe vous accompagne pour trouver le masque le plus confortable et ajuster les paramètres. La plupart des patients s\'habituent rapidement.',
    },
    {
      question: 'Combien de temps pour être appareillé ?',
      answer: 'Une fois votre prescription reçue et après nous avoir contactés, nous organisons l\'installation à domicile généralement sous 5 à 7 jours. En cas d\'urgence, nous pouvons accélérer la procédure.',
    },
    {
      question: 'Que faire en cas de panne ?',
      answer: 'Nous avons un service d\'urgence joignable par téléphone. En cas de panne, nous envoyons un appareil de remplacement dans les plus brefs délais (généralement sous 24h-48h).',
    },
    {
      question: 'Dois-je utiliser la machine toutes les nuits ?',
      answer: 'Oui, pour que le traitement soit efficace et pour maintenir le remboursement, il faut utiliser la machine chaque nuit. La Sécurité sociale exige une utilisation minimale (généralement plus de 3h par nuit sur au moins 20 jours par mois).',
    },
    {
      question: 'Comment nettoyer mon masque ?',
      answer: 'Le masque doit être nettoyé quotidiennement avec de l\'eau tiède et du savon doux (type savon de Marseille), puis séché à l\'air libre. Nous vous fournissons un guide d\'entretien complet lors de l\'installation.',
    },
  ];

  const faqsMedecins = [
    {
      question: 'Comment Exp\'Air Medical transmet les données d\'observance ?',
      answer: 'Nous transmettons les rapports d\'observance de manière automatisée via votre espace médecin sécurisé. Vous recevez également des rapports périodiques par email selon votre préférence. Les données incluent l\'utilisation quotidienne, les fuites, la pression et l\'IAH résiduel.',
    },
    {
      question: 'Comment est respectée la confidentialité des données ?',
      answer: 'Les données sont hébergées sur des serveurs certifiés HDS (Hébergeur de Données de Santé) et conformes RGPD. Seuls vous, votre patient et l\'équipe Exp\'Air Medical affectée au suivi avez accès aux données. Nous appliquons le strict respect du secret médical.',
    },
    {
      question: 'Comment mes patients peuvent-ils choisir Exp\'Air Medical ?',
      answer: 'Il suffit que le patient vous indique son souhait d\'être suivi par Exp\'Air Medical. Vous inscrivez "Exp\'Air Medical" comme prestataire sur l\'ordonnance de PPC. Nous fournissons un document explicatif que le patient peut vous remettre.',
    },
    {
      question: 'Que fait Exp\'Air en cas de mauvaise observance ?',
      answer: 'Nous contactons systématiquement le patient dès qu\'une baisse d\'observance est détectée. Nous identifions les problèmes (inconfort, fuites, difficultés), proposons des solutions (changement de masque, ajustement...) et vous en informons. Notre objectif est d\'intervenir avant que le problème ne s\'aggrave.',
    },
    {
      question: 'Comment demander un accès à l\'espace médecin ?',
      answer: 'Contactez-nous via le formulaire de contact ou par téléphone en indiquant vos coordonnées professionnelles et votre numéro RPPS. Nous vérifions votre statut et créons votre accès sous 24h.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-96 h-96 bg-[#007AFF] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <HelpCircle className="w-16 h-16 text-[#007AFF] mx-auto mb-6" />
            <h1 className="text-5xl lg:text-6xl text-[#1A1A1A] mb-6">
              Foire aux questions
            </h1>
            <p className="text-xl text-[#5C5C5C]">
              Retrouvez les réponses aux questions les plus fréquentes sur l'apnée du sommeil, 
              le traitement et le fonctionnement avec Medical.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQs Patients */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-4xl text-[#1A1A1A] mb-3">Questions des patients</h2>
            <p className="text-lg text-[#5C5C5C]">
              Tout ce que vous devez savoir sur votre parcours et votre traitement
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqsPatients.map((faq, index) => (
              <motion.div
                key={index}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-[#F2F0EB] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#E8E5DE] transition-colors"
                >
                  <span className="text-lg text-[#1A1A1A] pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-6 h-6 text-[#007AFF] flex-shrink-0 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5 text-[#5C5C5C]">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Médecins */}
      <section className="py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-4xl text-[#1A1A1A] mb-3">Questions des médecins</h2>
            <p className="text-lg text-[#5C5C5C]">
              Informations sur la collaboration avec Medical
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqsMedecins.map((faq, index) => (
              <motion.div
                key={index}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index + 100 ? null : index + 100)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#F2F0EB] transition-colors"
                >
                  <span className="text-lg text-[#1A1A1A] pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-6 h-6 text-[#18753C] flex-shrink-0 transition-transform ${
                      openIndex === index + 100 ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index + 100 && (
                  <div className="px-6 pb-5 text-[#5C5C5C]">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl lg:text-5xl text-[#1A1A1A] mb-6">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="text-xl text-[#5C5C5C] mb-8">
              Notre équipe est à votre disposition pour répondre à toutes vos questions.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg"
            >
              Nous contacter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}