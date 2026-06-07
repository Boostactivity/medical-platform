# Exp'Air Medical - Site Web Complet

> Site web professionnel pour Exp'Air Medical (anciennement Elia Medical), spécialiste de l'apnée du sommeil en France.

## 🚀 Statut du projet

✅ **Production Ready** - Site complet avec 15 pages, 3 dashboards et système d'authentification robuste.

🎉 **NOUVEAU - Phase 4 Complète** : Architecture pré-monorepo avec packages réutilisables, sécurité renforcée et hooks métier. [→ Voir le récapitulatif](./RECAP_PHASE_4_COMPLETE.md)

## 📦 Repository GitHub

**URL :** https://github.com/Boostactivity/ExpAir-Medical-V2.git  
**Organisation :** Boostactivity  
**Documentation :** [GITHUB_CONFIG.md](./GITHUB_CONFIG.md)

---

## ⚠️ PROBLÈME D'AUTHENTIFICATION ?

**Erreur "Forbidden - Not a doctor account" ?** → Consultez **[PROBLEME_AUTH_SOLUTION.md](PROBLEME_AUTH_SOLUTION.md)** pour la solution complète.

**Solution rapide** : Allez sur `/force-logout` puis reconnectez-vous.

---

# Exp'Air Medical - Site Web Complet

Site web professionnel pour Exp'Air Medical, entreprise française d'appareillage respiratoire spécialisée dans l'apnée du sommeil.

## 🎯 Objectif

Créer une plateforme moderne et pédagogique qui :
- Informe les patients sur l'apnée du sommeil
- Explique le parcours de diagnostic et de traitement PPC
- Positionne Exp'Air comme alternative moderne aux prestataires traditionnels
- Offre des espaces personnalisés pour patients, médecins et administrateurs

## 🎨 Design

Design épuré inspiré d'Apple avec :
- Palette de couleurs claires et professionnelles
- Navigation fluide et intuitive
- Animations subtiles avec Motion (Framer Motion)
- Responsive sur tous les appareils

## 📄 Pages du Site (14 pages minimum)

### Pages Publiques
1. **Accueil** (`/`) - Présentation générale et navigation
2. **Apnée du Sommeil** (`/apnee-sommeil`) - Information pédagogique sur la pathologie
3. **Parcours Diagnostic** (`/parcours-diagnostic`) - Explication du diagnostic en France
4. **Traitement PPC** (`/traitement-ppc`) - Détails sur le traitement
5. **Pourquoi Exp'Air** (`/pourquoi-expair`) - Avantages concurrentiels
6. **Qui Sommes-Nous** (`/qui-sommes-nous`) - Présentation de l'entreprise
7. **FAQ** (`/faq`) - Questions fréquentes
8. **Contact** (`/contact`) - Formulaire de contact
9. **Mentions Légales** (`/mentions-legales`) - Informations légales

### Pages de Connexion
10. **Espace Patient** (`/espace-patient`) - Connexion patients
11. **Espace Médecin** (`/espace-medecin`) - Connexion médecins

### Dashboards Sécurisés
12. **Dashboard Patient** (`/dashboard-patient`) - Interface patient avec données personnelles
13. **Dashboard Médecin** (`/dashboard-medecin`) - Interface médecin pour suivre les patients
14. **Dashboard Admin** (`/dashboard-admin`) - Interface administrateur

### Page d'Erreur
15. **404 Not Found** (`*`) - Page d'erreur élégante

## 🔒 Système d'Authentification

- **Backend** : Supabase Auth + Edge Functions
- **Types d'utilisateurs** : Patient, Médecin, Administrateur
- **Sécurité** : Chaque utilisateur accède uniquement à ses données
- **Tokens** : JWT avec access_token stocké localement

### Comptes de démonstration

| Rôle | Email | Mot de passe | Redirect |
|------|-------|--------------|----------|
| **Patient** | `patient@demo.fr` | `Test-123` | `/dashboard-patient` |
| **Médecin** | `doctor@demo.fr` | `Test-123` | `/dashboard-medecin` |
| **Admin** | `admin@demo.fr` | `Test-123` | `/dashboard-admin` |

---

## 🔧 Résolution des problèmes d'authentification

### ❌ Erreur "Forbidden - Not a doctor account" ?

**Solution rapide (30 secondes)** :
1. Allez sur `/force-logout`
2. Attendez la fin du processus
3. Reconnectez-vous sur la page appropriée

**Solution complète (2 minutes)** :
1. Allez sur `/fix-auth`
2. Cliquez sur "Réparer l'authentification"
3. Attendez les 5 étapes
4. Reconnectez-vous

**Besoin d'aide ?**
- 📚 **Guide complet** : `/aide-auth`
- ⚡ **Solution rapide** : `/force-logout`
- 🔧 **Réparation** : `/fix-auth`
- 📖 **Documentation** : Consultez `/SOLUTION_TOKEN_JWT.md`

### Pages d'aide disponibles
- `/force-logout` - Déconnexion forcée avec nettoyage complet des tokens
- `/fix-auth` - Réparation automatique complète avec recréation des comptes
- `/aide-auth` - Guide utilisateur complet avec explications détaillées
- `/init-demo` - Initialisation des comptes de démonstration

### Documentation technique
- `SOLUTION_TOKEN_JWT.md` - Explication complète du problème et des solutions
- `GUIDE_RESOLUTION_ERREUR_AUTH.md` - Guide utilisateur simplifié
- `DIAGNOSTIC_AUTH.md` - Outils de diagnostic pour développeurs
- `CHANGELOG_AUTH_FIX.md` - Liste complète des modifications apportées
- `QUICK_FIX.md` - Guide ultra-rapide pour résolution immédiate

## 🛠️ Technologies

- **Framework** : React 18 avec TypeScript
- **Routing** : React Router v6
- **Styling** : Tailwind CSS v4
- **Animations** : Motion (Framer Motion)
- **Icons** : Lucide React
- **Backend** : Supabase (Auth, Functions, Storage)
- **Server** : Hono (Edge Functions)
- **Notifications** : Sonner

## 📊 Fonctionnalités

### Pour les Patients
- Visualisation des données d'observance PPC
- Graphiques d'utilisation quotidienne
- Accès aux documents médicaux
- Contact avec l'équipe médicale
- Gestion des rendez-vous

### Pour les Médecins
- Liste des patients suivis
- Statistiques d'observance par patient
- Gestion des prescriptions
- Communication avec les patients

### Pour les Administrateurs
- Gestion complète des utilisateurs
- Statistiques globales
- Gestion du matériel
- Export de données

## 🚀 Démarrage

Le site est prêt à l'emploi. Naviguez simplement vers :
- `/` pour la page d'accueil
- `/espace-patient` pour vous connecter en tant que patient
- `/espace-medecin` pour vous connecter en tant que médecin

## 📱 Responsive

Le site est entièrement responsive et optimisé pour :
- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

## ♿ Accessibilité

- Navigation au clavier
- Labels ARIA appropriés
- Contrastes de couleurs conformes WCAG
- Focus visible sur tous les éléments interactifs

## 🎯 Remboursements

Le site inclut des informations transparentes sur :
- La prise en charge Sécurité Sociale (60%)
- Le complément mutuelle
- Le reste à charge (généralement 0€)
- Le parcours administratif

## 📞 Contact

- **Téléphone** : 01 XX XX XX XX
- **Email** : contact@expair-medical.fr
- **Urgences 24/7** : Astreinte technique disponible

## 📄 Licence

Projet propriétaire - Exp'Air Medical © 2024

---

**Note** : Ce site est un prototype fonctionnel. Pour une mise en production, il faudra :
1. Configurer les vraies variables d'environnement Supabase
2. Remplacer les coordonnées de contact
3. Ajouter les mentions légales complètes
4. Configurer le serveur email pour les notifications
5. Mettre en place l'authentification sociale (Google, etc.)