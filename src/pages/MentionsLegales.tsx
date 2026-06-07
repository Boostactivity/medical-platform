import { motion } from 'motion/react';
import { Shield, FileText, Lock } from 'lucide-react';

export function MentionsLegales() {
  const fadeInUp = {
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <FileText className="w-16 h-16 text-[#007AFF] mx-auto mb-6" />
            <h1 className="text-5xl lg:text-6xl text-[#1A1A1A] mb-6">
              Mentions légales
            </h1>
            <p className="text-xl text-[#5C5C5C]">
              Informations légales et politique de confidentialité d'Medical
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="prose prose-lg max-w-none">
            {/* Mentions légales */}
            <div className="mb-16">
              <h2 className="text-3xl text-[#1A1A1A] mb-6 flex items-center gap-3">
                <Shield className="w-8 h-8 text-[#007AFF]" />
                Mentions légales
              </h2>
              
              <div className="bg-[#F2F0EB] rounded-2xl p-8 space-y-6">
                <div>
                  <h3 className="text-xl text-[#1A1A1A] mb-2">Éditeur du site</h3>
                  <p className="text-[#5C5C5C]">
                    <strong>Raison sociale :</strong> Medical SAS<br />
                    <strong>Siège social :</strong> Paris, France<br />
                    <strong>SIRET :</strong> XXX XXX XXX XXXXX<br />
                    <strong>Email :</strong> contact@medical-sante.fr<br />
                    <strong>Téléphone :</strong> 01 XX XX XX XX
                  </p>
                </div>

                <div>
                  <h3 className="text-xl text-[#1A1A1A] mb-2">Directeur de publication</h3>
                  <p className="text-[#5C5C5C]">
                    [Nom du directeur de publication]
                  </p>
                </div>

                <div>
                  <h3 className="text-xl text-[#1A1A1A] mb-2">Hébergement</h3>
                  <p className="text-[#5C5C5C]">
                    Ce site est hébergé par Supabase Inc.<br />
                    Les données de santé sont hébergées sur des serveurs certifiés HDS (Hébergeur de Données de Santé) conformes à la réglementation française et européenne.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl text-[#1A1A1A] mb-2">Agréments</h3>
                  <p className="text-[#5C5C5C]">
                    Medical est un prestataire de santé à domicile agréé par l'Agence Régionale de Santé (ARS).<br />
                    <strong>Numéro d'agrément :</strong> [Numéro ARS]<br />
                    <strong>Certifications :</strong> HAS, ISO XXXX
                  </p>
                </div>
              </div>
            </div>

            {/* Politique de confidentialité */}
            <div className="mb-16" id="confidentialite">
              <h2 className="text-3xl text-[#1A1A1A] mb-6 flex items-center gap-3">
                <Lock className="w-8 h-8 text-[#007AFF]" />
                Politique de confidentialité
              </h2>

              <div className="space-y-8">
                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Collecte des données personnelles</h3>
                  <p className="text-[#5C5C5C] mb-4">
                    Dans le cadre de nos services, nous collectons les données personnelles suivantes :
                  </p>
                  <ul className="list-disc list-inside text-[#5C5C5C] space-y-2">
                    <li>Données d'identification (nom, prénom, date de naissance)</li>
                    <li>Coordonnées (adresse, téléphone, email)</li>
                    <li>Données de santé (diagnostic, traitement, observance)</li>
                    <li>Données de connexion (logs, IP)</li>
                  </ul>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Finalités du traitement</h3>
                  <p className="text-[#5C5C5C] mb-4">
                    Vos données sont collectées pour :
                  </p>
                  <ul className="list-disc list-inside text-[#5C5C5C] space-y-2">
                    <li>La mise en place et le suivi de votre traitement médical</li>
                    <li>La facturation à la Sécurité sociale et votre mutuelle</li>
                    <li>L'amélioration de la qualité de nos services</li>
                    <li>Le respect de nos obligations légales et réglementaires</li>
                  </ul>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Base légale</h3>
                  <p className="text-[#5C5C5C]">
                    Le traitement de vos données de santé repose sur :<br />
                    - Votre consentement explicite<br />
                    - L'exécution d'un contrat de soin<br />
                    - Le respect d'obligations légales (facturation, déclarations obligatoires)<br />
                    - Notre intérêt légitime (amélioration des services)
                  </p>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Destinataires des données</h3>
                  <p className="text-[#5C5C5C] mb-4">
                    Vos données sont accessibles uniquement à :
                  </p>
                  <ul className="list-disc list-inside text-[#5C5C5C] space-y-2">
                    <li>L'équipe Medical directement impliquée dans votre suivi</li>
                    <li>Votre médecin prescripteur</li>
                    <li>La Sécurité sociale et votre organisme complémentaire (facturation)</li>
                    <li>Les autorités de santé dans le cadre de contrôles réglementaires</li>
                  </ul>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Sécurité des données</h3>
                  <p className="text-[#5C5C5C]">
                    Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour assurer la sécurité de vos données :<br />
                    - Hébergement certifié HDS<br />
                    - Chiffrement des données sensibles<br />
                    - Accès restreint et authentification forte<br />
                    - Traçabilité des accès<br />
                    - Sauvegarde régulière<br />
                    - Plan de reprise d'activité
                  </p>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Durée de conservation</h3>
                  <p className="text-[#5C5C5C]">
                    Conformément aux obligations légales :<br />
                    - Dossier médical : 20 ans après le dernier contact<br />
                    - Données de facturation : 10 ans<br />
                    - Données de connexion : 1 an
                  </p>
                </div>

                <div className="bg-[#F2F0EB] rounded-2xl p-8">
                  <h3 className="text-xl text-[#1A1A1A] mb-4">Vos droits</h3>
                  <p className="text-[#5C5C5C] mb-4">
                    Conformément au RGPD, vous disposez des droits suivants :
                  </p>
                  <ul className="list-disc list-inside text-[#5C5C5C] space-y-2">
                    <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                    <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
                    <li><strong>Droit à l'effacement :</strong> sous certaines conditions</li>
                    <li><strong>Droit à la limitation :</strong> limiter le traitement</li>
                    <li><strong>Droit à la portabilité :</strong> récupérer vos données</li>
                    <li><strong>Droit d'opposition :</strong> vous opposer au traitement</li>
                    <li><strong>Droit de retrait du consentement</strong></li>
                  </ul>
                  <p className="text-[#5C5C5C] mt-4">
                    Pour exercer vos droits, contactez-nous à : dpo@medical-sante.fr<br />
                    Vous pouvez également saisir la CNIL : www.cnil.fr
                  </p>
                </div>
              </div>
            </div>

            {/* Données de santé */}
            <div className="mb-16" id="donnees-sante">
              <h2 className="text-3xl text-[#1A1A1A] mb-6">Protection des données de santé</h2>
              
              <div className="bg-[#007AFF]/10 border-2 border-[#007AFF]/30 rounded-2xl p-8">
                <p className="text-[#1A1A1A] mb-4">
                  <strong>Engagement spécifique sur les données de santé</strong>
                </p>
                <p className="text-[#5C5C5C] mb-4">
                  Les données de santé sont des données sensibles qui bénéficient d'une protection renforcée. 
                  Medical s'engage à :
                </p>
                <ul className="list-disc list-inside text-[#5C5C5C] space-y-2">
                  <li>Ne collecter que les données strictement nécessaires</li>
                  <li>Respecter le secret médical en toutes circonstances</li>
                  <li>Ne jamais vendre ou commercialiser vos données</li>
                  <li>Héberger vos données exclusivement en France sur des serveurs HDS</li>
                  <li>Former régulièrement nos équipes à la confidentialité</li>
                  <li>Réaliser des audits de sécurité réguliers</li>
                </ul>
              </div>
            </div>

            {/* Cookies */}
            <div className="mb-16">
              <h2 className="text-3xl text-[#1A1A1A] mb-6">Cookies et traceurs</h2>
              
              <div className="bg-[#F2F0EB] rounded-2xl p-8">
                <p className="text-[#5C5C5C] mb-4">
                  Notre site utilise des cookies pour :
                </p>
                <ul className="list-disc list-inside text-[#5C5C5C] space-y-2 mb-4">
                  <li><strong>Cookies essentiels :</strong> nécessaires au fonctionnement du site (pas de consentement requis)</li>
                  <li><strong>Cookies d'authentification :</strong> maintenir votre session de connexion</li>
                  <li><strong>Cookies d'analyse :</strong> mesurer l'audience (avec votre consentement)</li>
                </ul>
                <p className="text-[#5C5C5C]">
                  Vous pouvez paramétrer vos préférences à tout moment dans les paramètres de votre navigateur.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-[#F2F0EB] rounded-2xl p-8">
              <h3 className="text-2xl text-[#1A1A1A] mb-4">Contact</h3>
              <p className="text-[#5C5C5C]">
                Pour toute question concernant vos données personnelles :<br />
                <strong>Délégué à la Protection des Données (DPO)</strong><br />
                Email : dpo@medical-sante.fr<br />
                Courrier : Medical - DPO, Paris, France
              </p>
            </div>

            <p className="text-sm text-[#5C5C5C] mt-8">
              Dernière mise à jour : Décembre 2024
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
