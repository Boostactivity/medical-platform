# Medical — Suivi du build (source de vérité : on coche à chaque livraison)

> Specs : `C:\Users\adelm\Documents\medical\research\` (09 catalogue P0/P1/P2, 14 mapping 6 surfaces, 15 playbook, 12 design system)
> Branche de travail : `rebuild/fondations-design-system`
> Règles verrouillées : nom = **Medical**, bleu = **#007AFF** (choix Adel 07/06), vouvoiement, anti-shame, ≥16px patient.

## ✅ Chantier 0 — Fondations (TERMINÉ 07/06/2026)
- [x] 0.1 Nettoyage : 12 pages debug/test + 3 composants debug supprimés, credentials démo retirés du login, 153 docs Figma Make archivés, deps RN sorties du package web, build réparé (jspdf, react-virtual)
- [x] 0.2 Backend : index.tsx 2080→100 lignes, middleware auth (requireAuth/requireRole), 4 modules routes, routes démo dangereuses supprimées
- [x] 0.3 Multi-tenant white-label : migration `100_multi_tenant_white_label.sql` (tenants/brands/agencies/teams + tenant_id + RLS ~45 tables), middleware requireTenant, TenantContext front + Header/Footer dynamiques — ⚠️ migration PAS encore appliquée sur Supabase live
- [x] 0.4 Routing par audience `/patient` `/medecin` `/pro` (+16 redirects legacy, guards rôles) + layer API unique (ApiError, apiPublic) + fix callback PSC cassé depuis l'origine

## ✅ Chantier 1 — Design system (TERMINÉ 07/06/2026)
- [x] 1.1 Tokens : palette (bleu #007AFF verrouillé Adel + terracotta + neutres chauds + sémantique DSFR), Source Serif 4 + Inter + JetBrains Mono, échelle 16px base, dark mode
- [x] 1.2 Migration ~1800 hex iOS (2 vagues, 148 fichiers), rampes colors.ts 50-900, gradients tri-couleur aplatis
- [x] 1.3 Fix bug whileInView (sections invisibles) sur 12 pages
- [x] 1.4 Rebrand Exp'Air → Medical (51 fichiers, routes, composants)

## ✅ Chantier 2 — Cœur revenue back-office PSAD (TERMINÉ 08/06/2026)
- [x] 2.1 Schéma SQL métier : migration `101_observance_lppr_billing.sql` — référentiel lppr_codes (10 codes LPP officiels seedés + tarifs versionnés SOURCÉS uniquement, NULL sinon), patient_therapy_status (phase 9.INI 91j générée), observance_periods (fenêtres 28j, bandes full/partial/low/none), billing_lines (statuts draft→paid/rejected), RLS tenant pattern 100
- [x] 2.2 Moteur observance : `observance-lppr-engine.ts` — fenêtre 28j glissante (observance_data.usage_hours), bandes full/partial/low/none, alertes franchissement seuils + notif prescripteur <112h, recalcul nightly (cron pg_cron 2h30, secret x-cron-secret)
- [x] 2.3 Moteur LPPR : pickLpprShortCode (9.INI ≤91j → switch auto TL1/2/3 ou NT1/2/3 selon consentement télésuivi, 9.SRO sans relevé), tarif versionné applicable à la date, génération billing_lines hebdo idempotente ; routes /observance/* + /billing/lines (transitions de statut validées draft→ready→transmitted→paid/rejected)
- [x] 2.4 Module PSDM HAS 2026 : migration 102 (psdm_chapters seedés — 4 chapitres SOURCÉS, psdm_criteria structure + import référentiel officiel POST /psdm/import-referentiel — les 60 critères nominatifs ne sont pas dans la recherche donc PAS inventés, assessments/actions/documents avec RLS tenant), routes /psdm/* (dashboard score, criteria, assessments, actions, documents, audit-export JSON), page /pro/conformite (gauge score, chapitres, workflow remédiation, coffre, alerte déconventionnement = critique non conforme sans action ouverte)
- [x] 2.5 Facturation : `fse-transmitter.ts` (interface FseTransmitter + MockFseTransmitter réfs MOCK-* explicites + point d'extension SDK Area Santé), POST /billing/transmit (ready→transmitted/rejected), section Facturation LPPR dans /pro/finance (totaux par statut, validation brouillons, transmission, tableau lignes) — build ✓
- [x] 2.6 Stock & parc machines : migration 103 (agency_id+lot/série défensifs, mask/filter/tubing sur device_assignments, table stock_movements journal complet), routes /stock/* /parc/* (overview, items entrée/sortie gardées, machines avec âge masque vs 90j, orphelines), pages /pro/stock + /pro/parc
- [x] 2.7 Planning techniciens : table technician_schedules (1 affectation vivante par intervention), routes /planning/* (day/week/assign avec sync interventions), page /pro/planning (vues jour/semaine par technicien)
- [x] 2.8 Dashboards /pro branchés VRAIES données : FleetObservanceWidget (bandes 28j + patients <112h) dans DashboardAdmin, fallback démo 6 faux patients purgé de DashboardMedecin, MOCK_CONVERSATIONS purgées de Support, credentials démo retirés d'EspaceAdmin + badge "E" login, nav DashboardLayout assainie (liens morts retirés, Planning/Stock/Parc/Conformité ajoutés) — reste pour ch.3 : DashboardPatient fallback, recyclage Dashboard.tsx
- [x] 2.9 QA : build complet ✓, guard /pro/* → /auth/login vérifié, homepage + login sans régression (screenshots) — ⚠️ QA visuel INTERNE des pages /pro (avec session) à faire au premier déploiement avec compte réel + migrations appliquées

## ✅ Chantier 3 — Portails patient + médecin (TERMINÉ 08/06/2026)
- [x] 3.1 Patient : score nightly 0-100 transparent (breakdown 6 critères du scoring-engine expliqué en langage simple) + historique 7/30/90/365j + observance 28j sans culpabilisation — migration 104, routes /patient/*, rebuild DashboardPatient, fallback Jean Dupont purgé
- [x] 3.2 Patient : gamification forgiveness — streaks OPT-IN désactivables (default OFF), nuits cumulées jamais resetées, jardin SVG 5 stades corail, badges renommés sobres ("1 mois de traitement régulier"), copy anti-shame validée
- [x] 3.3 Patient : déclaration panne/problème → patient_tickets + préférences (notifications max 1/j) + page Mes données existante conservée
- [ ] 3.4 Patient : marketplace consommables — REPORTÉ (catalogue+commande = chantier dédié après vitrine ; le calendrier de remplacement existe déjà via equipment_inventory.renewal_due_at)
- [x] 3.5 Médecin : cohorte triée par priorité clinique (pastilles bandes observance, tri/filtres/recherche), drawer fiche patient (courbe 90j, fenêtres 28j, alertes) — migration 105, routes /doctor/*, rebuild DashboardMedecin
- [x] 3.6 Médecin : alertes prioritaires cohorte + bloc-notes privé autosave (doctor_notes RLS owner-only) + mention accord préalable AmeliPro en phase 9.INI
- [x] 3.7 Build ✓, guards /patient et /medecin vérifiés, commit — fixes critiques au passage : moteur observance robuste aux 2 dialectes usage_hours/hours_used, génération de données observance FICTIVES supprimée de la création patient

## ✅ Chantier 4 — Vitrine white-label (TERMINÉ 08/06/2026)
- [x] 4.1 Refonte HomePage : hero resserré, bandeau réassurance, parcours 4 étapes cartes unifiées (fin pastel Figma Make), Pourquoi Medical sobre, bandeau espaces, copy vouvoiement 9-11 ans, superlatifs supprimés
- [x] 4.2 Carte géo interactive : AgencyMap (Leaflet/OSM zéro clé API, marqueurs #007AFF, état vide honnête) + route publique /public/agencies — intégrée HomePage + Contact
- [x] 4.3 Template pathologie PathologyLayout (hero serif, sommaire ancres, FAQ accessibles) → ApneeSommeil/ParcoursDiagnostic/TraitementPPC refactorées, contenu médical conservé
- [x] 4.4 Harmonisation PourquoiMedical/QuiSommesNous/Contact (cartes unifiées, terracotta réservé aux CTAs secondaires)
- [x] 4.5 Compliance : mention réglementaire DM marquage CE footer, schema.org MedicalBusiness, robots.txt (espaces désindexés), sitemap.xml + FIX publicDir Vite (service worker PWA était en 404 depuis l'origine)
- [x] 4.6 QA visuel : desktop full ✓, mobile 375px ✓ (zéro overflow, CTAs pleine largeur), page pathologie ✓ — commit fait

## 🔄 Chantier 5 — Apps mobiles (React Native/Expo, package séparé)
- [x] 5.1 Package autonome apps/mobile (git mv, rebrand Medical, tsconfig+babel, npm install Expo SDK 50, tsc --noEmit ZÉRO erreur) — ⚠️ vérification = compilation ; test sur device réel à faire au premier expo start
- [x] 5.2 App technicien : groupe (technicien)/ — planning jour offline (WatermelonDB observé, badges, bandeau offline), fiche intervention 3 étapes (check-in 64px → formulaire → signature SVG au doigt → check-out), stock camion, routing par rôle au login (vraie auth Supabase + SecureStore), schéma v2 + outbox ordonnée avec retry. Backend : rôle technicien ouvert (prestataire-ops + stock-parc), migration 106 signature_svg/check_in_at/check_out_at + /complete les accepte. tsc zéro erreur ✓ — ⚠️ scan QR non fait (expo-barcode-scanner non installé, à ajouter avec test device) ; heure précise des RDV limitée à Matin/Après-midi (le planning serveur ne porte que time_slot)
- [x] 5.3 App patient : écran matinal réel (cercle score + 6 critères expliqués + jauge observance 28j + progression), historique 7/30/90/365j, profil avec switch streaks opt-in confirmé serveur, barre d'onglets créée (il n'y en avait aucune), cache offline database.localStorage avec bandeau date, copy anti-shame — fini le PATIENT_ID_HERE en dur qui crashait. tsc zéro erreur ✓
- [ ] 5.4 Test device réel (expo start sur téléphone) — SEULE étape mobile restante, impossible sans device/émulateur sur ce PC. Restes connus : night/[id] et alerts/ encore sur données simulées locales (pas d'équivalent API patient), garde de session globale racine à câbler, scan QR à ajouter (expo-barcode-scanner)

## ✅ DÉPLOIEMENT (FAIT 08/06/2026)
- [x] Source pushé : Sitewebmedical2 branche rebuild/fondations-design-system (20 commits)
- [x] Vercel live : medical2-two.vercel.app (repo medical-platform resynchronisé, node_modules sorti du repo)
- [x] ⚠️ Projet Supabase historique ilskgkcbqnyydetsiwvi MORT (pause >90j, irrécupérable) → bascule sur le projet "Medical" **nwpbrxxxwrutacixeuxq** restauré
- [x] Base : wipe schéma démo medconnect.fr (vérifié 100% fictif) + réinstallation complète — 34 tables, 24/24 essentielles, 10 codes LPPR seedés, tenant medical, 4 chapitres PSDM. Fixes : sleep_data DDL reconstruit (n'existait nulle part), profiles en vue, tables runtime devices/assignments/inventory (les fichiers legacy 001/002/003/business/URGENT/iot_triggers se contredisent — remplacés chirurgicalement, voir deploy/fixes/)
- [x] Edge Functions déployées (verify_jwt=false) + fix montage Hono (routes publiques en premier, middleware patient scopé /patient/*)
- [x] QA backend : /health 200, /public/agencies 200, guard 401 sans session ; front live branché sur le nouveau projet
- ⚠️ Plan gratuit Supabase : pause auto après ~1 sem d'inactivité, mort à 90j → passer Pro (~25$/mois) ou HDS pour la vraie prod

## 🔄 Vague 6 — Services patient + Connecteur extraction (EN COURS 08/06)
- [ ] 6.1 Marketplace consommables : catalogue, commande, calendrier remplacement, transparence Sécu, suivi commandes (web patient + gestion pro)
- [ ] 6.2 Prise de RDV : créneaux proposés par le prestataire, demande/modification patient, lien planning techniciens
- [ ] 6.3 Documents : attestation voyage auto-générée, rapports PDF partageables, espace documents patient
- [ ] 6.4 Messagerie sécurisée patient↔prestataire↔médecin (threads, non-lus, pièces jointes métadonnées)
- [ ] 6.5 **CONNECTEUR EXTRACTION AUTO (idée Adel 08/06)** : les PSAD ont déjà leurs accès aux portails fabricants (AirView, Care Orchestrator...) → worker d'extraction automatique N×/jour avec les identifiants DU PRESTATAIRE (chiffrés par tenant), ingestion via universal-adapter existant → alimente observance_data → moteur LPPR. Pas besoin de NDA fabricant.

## ⏳ Vague 7 — Engagement (sleep school structure+quiz, communauté modérée, FFAAIR, newsletter, care check-in J1-J28)
## ⏳ Vague 8 — Pro avancé (segmentation patients, tickets SAV/SLA, optimisation tournées, CRM prescripteurs, exports CPAM, comparaison agences)
## ⏳ Vague 9 — Intelligence (lecteur SD EDF+ universel, score risque décrochage, forecasting, benchmark)

## 📌 Dépendances externes restantes (PAS codables)
- [ ] Dossier Pro Santé Connect : prêt depuis mars, manque SIRET → **à envoyer (action Adel)** + reconfigurer PSC_* env sur le NOUVEAU projet Supabase
- [ ] SDK FSE SESAM-Vitale agréé (Area Santé) → module codé avec interface mockable en attendant
- [ ] Connecteurs fabricants (ResMed AirView...) : NDA requis → fallback lecteur SD EDF+ universel
- [ ] Créer les comptes réels (admin tenant, 1 médecin, 1 technicien) + saisir les agences (la carte vitrine est en état vide)
- [ ] Cron pg_cron observance nightly à activer sur le nouveau projet (cron-config.ts, URL + secret à poser)
- [ ] Hébergement HDS (OVH Healthcare / Scaleway HDH) pour la prod réelle (décision tranchée : Voie A sous-traitée)
- [ ] White-label multi-domaines (V2) : policy RLS lecture PUBLIQUE sur brands (résolution par custom_domain pour visiteurs anonymes) — aujourd'hui TenantContext fallback Medical, suffisant en mono-tenant
- [ ] Note architecture RLS : les nouvelles tables (observance, billing, psdm, stock) sont deny-all côté client direct (RESTRICTIVE sans permissive) — accès uniquement via Edge Functions service-role scopées tenant. C'est voulu (sécurisé par défaut).
