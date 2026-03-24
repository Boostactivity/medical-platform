import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../hooks/useTranslation';

export function Contact() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'patient',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t('contact.formSuccess'), {
      description: t('contact.formSuccessDesc'),
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <div className="bg-white dark:bg-background">
      {/* Hero */}
      <section className="relative py-20 lg:py-28 bg-[#f8fafc] dark:bg-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-light text-[#1a2b3c] dark:text-foreground mb-6 tracking-tight">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-gray-500 dark:text-muted-foreground font-light">
              {t('contact.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 lg:py-28 bg-white dark:bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <motion.div {...fadeInUp} className="lg:col-span-1 space-y-8">
              <div>
                <h2 className="text-2xl font-light text-[#1a2b3c] dark:text-foreground mb-8 tracking-tight">{t('contact.coordinates')}</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#1a2b3c] dark:text-foreground mb-0.5">{t('contact.phone')}</h4>
                      <p className="text-sm text-gray-500 dark:text-muted-foreground">01 XX XX XX XX</p>
                      <p className="text-xs text-gray-400">{t('contact.phoneHours')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#1a2b3c] dark:text-foreground mb-0.5">{t('contact.email')}</h4>
                      <p className="text-sm text-gray-500 dark:text-muted-foreground">contact@plateforme.fr</p>
                      <p className="text-xs text-gray-400">{t('contact.emailResponse')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#1a2b3c] dark:text-foreground mb-0.5">{t('contact.address')}</h4>
                      <p className="text-sm text-gray-500 dark:text-muted-foreground">{t('contact.addressValue')}</p>
                      <p className="text-xs text-gray-400">{t('contact.nationalCoverage')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#f8fafc] dark:bg-secondary border border-gray-100 rounded-2xl p-6">
                <h4 className="text-sm font-medium text-[#1a2b3c] dark:text-foreground mb-2">{t('contact.emergency')}</h4>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mb-4">
                  {t('contact.emergencyDesc')}
                </p>
                <a
                  href="tel:01XXXXXXXX"
                  className="inline-block px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-all"
                >
                  {t('contact.emergencyCall')}
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div {...fadeInUp} className="lg:col-span-2">
              <div className="bg-[#f8fafc] dark:bg-secondary border border-gray-100 rounded-2xl p-8 lg:p-10">
                <h2 className="text-2xl font-light text-[#1a2b3c] dark:text-foreground mb-2 tracking-tight">{t('contact.formTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mb-8">
                  {t('contact.formSubtitle')}
                </p>

                {submitted ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-light text-[#1a2b3c] dark:text-foreground mb-2">{t('contact.formSuccess')}</h3>
                    <p className="text-sm text-gray-500 dark:text-muted-foreground">
                      {t('contact.formSuccessDesc')}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-muted-foreground mb-1.5">{t('contact.formName')} *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="Jean Dupont"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-muted-foreground mb-1.5">{t('contact.formEmail')} *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="jean.dupont@exemple.fr"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-muted-foreground mb-1.5">{t('contact.formPhone')} *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="06 XX XX XX XX"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-muted-foreground mb-1.5">{t('contact.formYouAre')} *</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                        >
                          <option value="patient">{t('contact.formPatient')}</option>
                          <option value="proche">{t('contact.formRelative')}</option>
                          <option value="medecin">{t('contact.formDoctor')}</option>
                          <option value="autre">{t('contact.formOther')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-muted-foreground mb-1.5">{t('contact.formMessage')} *</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-2.5 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none resize-none"
                        placeholder={t('contact.formMessagePlaceholder')}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all inline-flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {t('contact.formSubmit')}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-20 lg:py-28 bg-[#f8fafc] dark:bg-secondary">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-light text-[#1a2b3c] dark:text-foreground tracking-tight">{t('contact.quickActions')}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: t('contact.actionSuspect'), desc: t('contact.actionSuspectDesc'), link: '/apnee-sommeil', gradient: 'from-blue-600 to-blue-400' },
              { title: t('contact.actionDiagnosed'), desc: t('contact.actionDiagnosedDesc'), link: '/pourquoi-nous', gradient: 'from-emerald-600 to-emerald-400' },
              { title: t('contact.actionDoctor'), desc: t('contact.actionDoctorDesc'), link: '/espace-medecin', gradient: 'from-violet-600 to-violet-400' },
            ].map((action, index) => (
              <Link key={action.title} to={action.link}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`bg-gradient-to-br ${action.gradient} rounded-2xl p-8 text-white hover:shadow-lg transition-all`}
                >
                  <h3 className="text-xl font-normal mb-2">{action.title}</h3>
                  <p className="text-sm opacity-80">{action.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
