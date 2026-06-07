import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AgencyMap } from '../components/vitrine/AgencyMap';

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
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-[#FAFAF7] border-b border-[#E8E5DE] pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] mb-5 leading-tight">
              Contactez-nous
            </h1>
            <p className="text-lg text-[#5C5C5C] leading-relaxed">
              Une question ? Un projet d'appareillage ? Notre équipe est à votre disposition
              pour vous accompagner dans votre parcours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Nos agences */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Nos agences près de chez vous
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Trouvez l'agence la plus proche de votre domicile pour l'installation
              et le suivi de votre traitement.
            </p>
          </motion.div>
          <motion.div {...fadeInUp}>
            <AgencyMap />
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
                <h2 className="text-3xl text-[#1A1A1A] mb-8">Nos coordonnées</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1A1A1A] mb-1">Téléphone</h4>
                      <p className="text-[#5C5C5C]">01 XX XX XX XX</p>
                      <p className="text-sm text-[#5C5C5C]">Lun-Ven : 9h-18h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1A1A1A] mb-1">Email</h4>
                      <p className="text-[#5C5C5C]">contact@medical-sante.fr</p>
                      <p className="text-sm text-[#5C5C5C]">Réponse sous 24h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <div>
                      <h4 className="text-[#1A1A1A] mb-1">Adresse</h4>
                      <p className="text-[#5C5C5C]">Paris, France</p>
                      <p className="text-sm text-[#5C5C5C]">Intervention nationale</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAF7] border border-[#E8E5DE] rounded-2xl p-6">
                <h4 className="text-[#1A1A1A] mb-3">Urgence technique</h4>
                <p className="text-[#5C5C5C] mb-4">
                  En cas de panne ou problème urgent avec votre appareil, 
                  une astreinte est disponible 24/7.
                </p>
                <a
                  href="tel:01XXXXXXXX"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-[#C45D40] text-white rounded-full hover:bg-[#A34A32] transition-colors"
                >
                  Appeler l'urgence
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div {...fadeInUp} className="lg:col-span-2">
              <div className="bg-[#FAFAF7] border border-[#E8E5DE] rounded-2xl p-6 sm:p-8 lg:p-12">
                <h2 className="text-3xl text-[#1A1A1A] mb-2">Envoyez-nous un message</h2>
                <p className="text-[#5C5C5C] mb-8">
                  Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement.
                </p>

                {submitted ? (
                  <div className="bg-[#18753C]/10 border-2 border-[#18753C]/30 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-[#18753C] mx-auto mb-4" />
                    <h3 className="text-2xl text-[#1A1A1A] mb-2">Message envoyé !</h3>
                    <p className="text-[#5C5C5C]">
                      Nous avons bien reçu votre message et vous recontacterons dans les plus brefs délais.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[#1A1A1A] mb-2">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#E8E5DE] rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="Jean Dupont"
                        />
                      </div>

                      <div>
                        <label className="block text-[#1A1A1A] mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#E8E5DE] rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="jean.dupont@exemple.fr"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[#1A1A1A] mb-2">Téléphone *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#E8E5DE] rounded-xl focus:border-[#007AFF] transition-all outline-none"
                          placeholder="06 XX XX XX XX"
                        />
                      </div>

                      <div>
                        <label className="block text-[#1A1A1A] mb-2">Vous êtes *</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#E8E5DE] rounded-xl focus:border-[#007AFF] transition-all outline-none"
                        >
                          <option value="patient">Patient</option>
                          <option value="proche">Proche d'un patient</option>
                          <option value="medecin">Médecin</option>
                          <option value="autre">Autre professionnel de santé</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#1A1A1A] mb-2">Votre message *</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 bg-white border border-[#E8E5DE] rounded-xl focus:border-[#007AFF] transition-all outline-none resize-none"
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
      <section className="py-16 lg:py-24 bg-[#FAFAF7] border-t border-[#E8E5DE]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A]">Vous êtes...</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { title: "Je pense souffrir d'apnée", desc: 'Faites le point sur vos symptômes', link: '/apnee-sommeil' },
              { title: 'Je suis déjà diagnostiqué', desc: 'Choisissez votre prestataire librement', link: '/pourquoi-medical' },
              { title: 'Je suis médecin', desc: 'Découvrez notre espace professionnel', link: '/medecin/connexion' },
            ].map((action, index) => (
              <motion.div
                key={action.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link
                  to={action.link}
                  className="block h-full bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow group"
                >
                  <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{action.title}</h3>
                  <p className="text-[#5C5C5C] mb-4 leading-relaxed">{action.desc}</p>
                  <span className="inline-flex items-center text-[#007AFF] group-hover:translate-x-1 transition-transform">
                    En savoir plus
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}