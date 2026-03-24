import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Contact() {
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
    // Simulate form submission
    toast.success('Message envoyé !', {
      description: 'Nous vous recontacterons dans les plus brefs délais.',
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
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#007AFF] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Contactez-nous
            </h1>
            <p className="text-lg text-[#86868B]">
              Une question ? Un projet d'appareillage ? Notre équipe est à votre disposition 
              pour vous accompagner dans votre parcours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <motion.div {...fadeInUp} className="lg:col-span-1 space-y-8">
              <div>
                <h2 className="text-3xl text-[#1D1D1F] mb-8">Nos coordonnées</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1D1D1F] mb-1">Téléphone</h4>
                      <p className="text-[#86868B]">01 XX XX XX XX</p>
                      <p className="text-sm text-[#86868B]">Lun-Ven : 9h-18h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1D1D1F] mb-1">Email</h4>
                      <p className="text-[#86868B]">contact@plateforme.fr</p>
                      <p className="text-sm text-[#86868B]">Réponse sous 24h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1D1D1F] mb-1">Adresse</h4>
                      <p className="text-[#86868B]">Paris, France</p>
                      <p className="text-sm text-[#86868B]">Intervention nationale</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] rounded-2xl p-6">
                <h4 className="text-[#1D1D1F] mb-3">Urgence technique</h4>
                <p className="text-[#86868B] mb-4">
                  En cas de panne ou problème urgent avec votre appareil, 
                  une astreinte est disponible 24/7.
                </p>
                <a
                  href="tel:01XXXXXXXX"
                  className="inline-block px-6 py-3 bg-[#FF9500] text-white rounded-full hover:bg-[#E08600] transition-all"
                >
                  Appeler l'urgence
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div {...fadeInUp} className="lg:col-span-2">
              <div className="bg-[#F5F5F7] rounded-3xl p-8 lg:p-12">
                <h2 className="text-3xl text-[#1D1D1F] mb-2">Envoyez-nous un message</h2>
                <p className="text-[#86868B] mb-8">
                  Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement.
                </p>

                {submitted ? (
                  <div className="bg-[#34C759]/10 border-2 border-[#34C759]/30 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-[#34C759] mx-auto mb-4" />
                    <h3 className="text-2xl text-[#1D1D1F] mb-2">Message envoyé !</h3>
                    <p className="text-[#86868B]">
                      Nous avons bien reçu votre message et vous recontacterons dans les plus brefs délais.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[#1D1D1F] mb-2">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="Jean Dupont"
                        />
                      </div>

                      <div>
                        <label className="block text-[#1D1D1F] mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="jean.dupont@exemple.fr"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[#1D1D1F] mb-2">Téléphone *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="06 XX XX XX XX"
                        />
                      </div>

                      <div>
                        <label className="block text-[#1D1D1F] mb-2">Vous êtes *</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none"
                        >
                          <option value="patient">Patient</option>
                          <option value="proche">Proche d'un patient</option>
                          <option value="medecin">Médecin</option>
                          <option value="autre">Autre professionnel de santé</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#1D1D1F] mb-2">Votre message *</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-[#007AFF] transition-all outline-none resize-none"
                        placeholder="Décrivez votre demande..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full md:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg inline-flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Envoyer le message
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-24 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-4xl text-[#1D1D1F] mb-4">Actions rapides</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Je pense souffrir d\'apnée', desc: 'Faites le point sur vos symptômes', link: '/apnee-sommeil', color: 'from-[#007AFF] to-[#5AC8FA]' },
              { title: 'Je suis déjà diagnostiqué', desc: 'Choisissez la plateforme comme prestataire', link: '/pourquoi-nous', color: 'from-[#34C759] to-[#30D158]' },
              { title: 'Je suis médecin', desc: 'Découvrez notre espace professionnel', link: '/espace-medecin', color: 'from-[#FF9500] to-[#FF3B30]' },
            ].map((action, index) => (
              <Link key={action.title} to={action.link}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`bg-gradient-to-br ${action.color} rounded-3xl p-8 text-white hover:shadow-2xl transition-shadow cursor-pointer`}
                >
                  <h3 className="text-2xl mb-3">{action.title}</h3>
                  <p className="opacity-90">{action.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}