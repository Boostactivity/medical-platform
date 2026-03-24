import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const faqsPatients = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
    { question: t('faq.q7'), answer: t('faq.a7') },
    { question: t('faq.q8'), answer: t('faq.a8') },
  ];

  const faqsMedecins = [
    { question: t('faq.qDoc1'), answer: t('faq.aDoc1') },
    { question: t('faq.qDoc2'), answer: t('faq.aDoc2') },
    { question: t('faq.qDoc3'), answer: t('faq.aDoc3') },
    { question: t('faq.qDoc4'), answer: t('faq.aDoc4') },
    { question: t('faq.qDoc5'), answer: t('faq.aDoc5') },
  ];

  return (
    <div className="bg-white dark:bg-background">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] dark:from-secondary dark:via-background dark:to-secondary overflow-hidden">
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
            <HelpCircle className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-light text-[#1a2b3c] dark:text-foreground mb-6 tracking-tight">
              {t('faq.title')}
            </h1>
            <p className="text-xl text-gray-500 dark:text-muted-foreground">
              {t('faq.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQs Patients */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1a2b3c] dark:text-foreground mb-3">{t('faq.patientsTitle')}</h2>
            <p className="text-lg text-gray-500 dark:text-muted-foreground">
              {t('faq.patientsSubtitle')}
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqsPatients.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-[#f8fafc] dark:bg-secondary rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="text-lg text-[#1a2b3c] dark:text-foreground pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-6 h-6 text-blue-600 flex-shrink-0 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5 text-gray-500 dark:text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Medecins */}
      <section className="py-24 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] dark:from-secondary dark:via-background dark:to-secondary">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1a2b3c] dark:text-foreground mb-3">{t('faq.doctorsTitle')}</h2>
            <p className="text-lg text-gray-500 dark:text-muted-foreground">
              {t('faq.doctorsSubtitle')}
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqsMedecins.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white dark:bg-card rounded-2xl overflow-hidden shadow-lg"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index + 100 ? null : index + 100)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#f8fafc] dark:bg-secondary transition-colors"
                >
                  <span className="text-lg text-[#1a2b3c] dark:text-foreground pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-6 h-6 text-emerald-500 flex-shrink-0 transition-transform ${
                      openIndex === index + 100 ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index + 100 && (
                  <div className="px-6 pb-5 text-gray-500 dark:text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
              {t('faq.ctaTitle')}
            </h2>
            <p className="text-xl text-gray-500 dark:text-muted-foreground mb-8">
              {t('faq.ctaSubtitle')}
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              {t('faq.ctaButton')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
