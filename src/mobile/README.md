# 📱 Exp'Air Medical - Application Mobile

**Framework :** React Native + Expo  
**Base de données locale :** WatermelonDB  
**Graphiques :** Victory Native  
**Synchronisation :** Supabase Realtime  

---

## 🎯 ARCHITECTURE MOBILE

### Piliers de Performance

#### PILIER 1 : RÉACTIVITÉ & FLUIDITÉ ⚡

**Objectif :** Application ultra-rapide, fonctionnant offline

| Technologie | Rôle | Gain Performance |
|-------------|------|------------------|
| **WatermelonDB** | Base locale SQLite | Démarrage instantané, 100% offline |
| **Victory Native** | Graphiques natifs | 60 FPS, rendu natif |
| **React Native** | Framework mobile | Performance native iOS/Android |
| **Expo** | Toolchain | Dev rapide, OTA updates |

---

## 📦 INSTALLATION

### Prérequis

```bash
# Node.js 18+
node --version

# Expo CLI
npm install -g expo-cli

# EAS CLI (pour build production)
npm install -g eas-cli
```

### Installation du projet mobile

```bash
# Depuis la racine du projet
cd mobile

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

---

## 🗂️ STRUCTURE DU PROJET

```
mobile/
├── app/                    # Expo Router (navigation)
│   ├── (tabs)/            # Navigation par onglets
│   │   ├── index.tsx      # Dashboard Patient
│   │   ├── historique.tsx # Historique sommeil
│   │   └── profil.tsx     # Profil utilisateur
│   ├── auth/              # Écrans d'authentification
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx        # Layout principal
│
├── components/            # Composants réutilisables
│   ├── charts/           # Graphiques Victory Native
│   │   ├── SleepChart.tsx
│   │   ├── ObservanceChart.tsx
│   │   └── IAHChart.tsx
│   ├── cards/            # Cartes d'information
│   │   ├── StatCard.tsx
│   │   ├── AlertCard.tsx
│   │   └── DeviceCard.tsx
│   └── layout/           # Layouts
│       ├── SafeArea.tsx
│       └── Container.tsx
│
├── database/             # WatermelonDB
│   ├── models/          # Modèles de données
│   │   ├── Patient.ts
│   │   ├── SleepData.ts
│   │   ├── Alert.ts
│   │   └── Device.ts
│   ├── schema.ts        # Schéma de base de données
│   ├── sync.ts          # Logique de synchronisation
│   └── index.ts         # Configuration WatermelonDB
│
├── services/            # Services
│   ├── supabase.ts     # Client Supabase
│   ├── sync.ts         # Service de synchronisation
│   └── notifications.ts # Push notifications
│
├── hooks/              # Hooks personnalisés
│   ├── useDatabase.ts  # Hook WatermelonDB
│   ├── useSync.ts      # Hook synchronisation
│   └── useOffline.ts   # Détection offline
│
├── utils/              # Utilitaires
│   ├── formatters.ts   # Formatage de données
│   └── validators.ts   # Validation
│
├── constants/          # Constantes
│   ├── Colors.ts       # Palette de couleurs
│   └── Config.ts       # Configuration app
│
├── app.json           # Configuration Expo
├── package.json       # Dépendances
└── tsconfig.json      # Configuration TypeScript
```

---

## 🔧 CONFIGURATION

### 1. Variables d'environnement

Créer `.env` à la racine de `mobile/` :

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://ilskgkcbqnyydetsiwvi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend
EXPO_PUBLIC_API_URL=https://ilskgkcbqnyydetsiwvi.supabase.co/functions/v1/make-server-50732e52

# App
EXPO_PUBLIC_APP_NAME=Exp'Air Medical
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### 2. Configuration Expo (`app.json`)

```json
{
  "expo": {
    "name": "Exp'Air Medical",
    "slug": "expair-medical",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1e3a5f"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.expairmedical.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1e3a5f"
      },
      "package": "com.expairmedical.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-sqlite"
    ]
  }
}
```

---

## 📊 WATERMELONDB - BASE DE DONNÉES LOCALE

### Architecture Offline-First

```
┌─────────────────────────────────────┐
│         APPLICATION MOBILE          │
│  (React Native Components)          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         WATERMELONDB                │
│  (Couche d'abstraction)             │
│  - Requêtes optimisées              │
│  - Lazy loading                     │
│  - Relations automatiques           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         SQLite LOCAL                │
│  (Base de données device)           │
│  - Stockage persistant              │
│  - Rapide (natif)                   │
│  - Fonctionne offline               │
└──────────────┬──────────────────────┘
               │
               ↓ (quand online)
┌─────────────────────────────────────┐
│       SYNCHRONISATION               │
│  (Bidirectionnelle)                 │
│  - Push : Local → Supabase          │
│  - Pull : Supabase → Local          │
│  - Conflict resolution              │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         SUPABASE POSTGRES           │
│  (Base de données cloud)            │
└─────────────────────────────────────┘
```

### Avantages

| Feature | Sans WatermelonDB | Avec WatermelonDB |
|---------|-------------------|-------------------|
| **Démarrage** | 2-3s (fetch API) | <100ms (local) |
| **Offline** | ❌ Impossible | ✅ 100% fonctionnel |
| **Scroll** | Lag si >100 items | 60 FPS (lazy load) |
| **Batterie** | Élevée (réseau) | Optimisée |
| **Expérience** | Roues qui tournent | Instantané |

---

## 📈 VICTORY NATIVE - GRAPHIQUES

### Composants disponibles

1. **VictoryChart** - Container de graphiques
2. **VictoryLine** - Courbes (sommeil, IAH)
3. **VictoryBar** - Barres (observance)
4. **VictoryPie** - Camemberts (répartition)
5. **VictoryArea** - Aires (tendances)

### Exemple : Graphique de sommeil

```tsx
import { VictoryChart, VictoryLine, VictoryAxis } from 'victory-native';

export function SleepChart({ data }) {
  return (
    <VictoryChart>
      <VictoryAxis dependentAxis />
      <VictoryAxis />
      <VictoryLine
        data={data}
        x="date"
        y="hours"
        style={{
          data: { stroke: '#5eb3d6' },
        }}
      />
    </VictoryChart>
  );
}
```

### Performance

- **Rendu natif** : Utilise les APIs graphiques natives (CoreGraphics sur iOS, Canvas sur Android)
- **60 FPS garanti** : Même avec 1000+ points de données
- **Animations fluides** : Transitions natives

---

## 🔄 SYNCHRONISATION

### Stratégie de synchronisation

#### Mode Online

```typescript
// Synchronisation automatique toutes les 5 minutes
setInterval(() => {
  if (isOnline) {
    syncDatabase();
  }
}, 5 * 60 * 1000);
```

#### Mode Offline

```typescript
// Queue des modifications en attente
const pendingChanges = [];

// Lors de la reconnexion
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    processPendingChanges();
  }
});
```

### Résolution de conflits

```typescript
// Last Write Wins (LWW)
if (localRecord.updatedAt > remoteRecord.updatedAt) {
  pushToServer(localRecord);
} else {
  updateLocal(remoteRecord);
}
```

---

## 🚀 COMMANDES

### Développement

```bash
# Démarrer le serveur
npm start

# Lancer sur iOS
npm run ios

# Lancer sur Android
npm run android

# Lancer sur Web (pour debug)
npm run web
```

### Build Production

```bash
# Build iOS
eas build --platform ios

# Build Android
eas build --platform android

# Build les deux
eas build --platform all
```

### Tests

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e
```

---

## 📱 FONCTIONNALITÉS MOBILE

### Dashboard Patient

- ✅ Statistiques du jour (heures, IAH, fuites)
- ✅ Graphique d'observance 30 jours
- ✅ Alertes et notifications
- ✅ Statut appareil (connecté/déconnecté)
- ✅ Score Exp'Air (gamification)

### Historique

- ✅ Liste des nuits avec détails
- ✅ Graphique IAH par nuit
- ✅ Export PDF
- ✅ Filtres par date

### Profil

- ✅ Informations personnelles
- ✅ Médecin traitant
- ✅ Appareil PPC
- ✅ Paramètres de l'app
- ✅ Synchronisation manuelle

---

## 🎨 DESIGN SYSTEM

### Palette de couleurs (identique au web)

```typescript
export const Colors = {
  // Bleus
  primary: '#1e3a5f',      // Bleu nuit
  secondary: '#5eb3d6',     // Turquoise clair
  accent: '#a8b5d1',        // Lavande

  // États
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#3b82f6',

  // Neutres
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
};
```

### Typographie

```typescript
export const Typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  small: { fontSize: 14, fontWeight: '400' },
  tiny: { fontSize: 12, fontWeight: '400' },
};
```

---

## 🔐 SÉCURITÉ

### Stockage sécurisé

```typescript
import * as SecureStore from 'expo-secure-store';

// Sauvegarder le token
await SecureStore.setItemAsync('auth_token', token);

// Récupérer le token
const token = await SecureStore.getItemAsync('auth_token');
```

### Biométrie

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Activer Face ID / Touch ID
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authentifiez-vous pour accéder',
});
```

---

## 📊 MÉTRIQUES DE PERFORMANCE

### Objectifs (basés sur les standards Apple/Google)

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Démarrage** | <1s | Time to Interactive |
| **FPS** | 60 | React DevTools |
| **Bundle size** | <5MB | `npx expo-updates`stats |
| **API calls** | <10/min | Network inspector |
| **Battery** | <3%/h | Instruments (Xcode) |

---

## 🐛 DEBUG

### React Native Debugger

```bash
# Installer
brew install --cask react-native-debugger

# Lancer
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

### Flipper

```bash
# Installer
brew install --cask flipper

# Lancer et connecter l'app
```

### Logs

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

---

## 📚 DOCUMENTATION COMPLÉMENTAIRE

- [React Native](https://reactnative.dev)
- [Expo](https://docs.expo.dev)
- [WatermelonDB](https://watermelondb.dev)
- [Victory Native](https://formidable.com/open-source/victory/docs/native/)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)

---

## ✅ CHECKLIST DE DÉMARRAGE

### Configuration initiale
- [ ] Node.js 18+ installé
- [ ] Expo CLI installé
- [ ] Variables d'environnement configurées
- [ ] Dépendances installées (`npm install`)

### Développement
- [ ] App démarre sur iOS Simulator
- [ ] App démarre sur Android Emulator
- [ ] Base de données WatermelonDB créée
- [ ] Synchronisation avec Supabase fonctionne

### Tests
- [ ] Connexion/déconnexion
- [ ] Chargement des données
- [ ] Graphiques s'affichent
- [ ] Mode offline fonctionne

---

**Version :** 1.0.0  
**Statut :** 🚧 EN DÉVELOPPEMENT  
**Prochaine étape :** Implémentation des modèles WatermelonDB
