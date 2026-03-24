# 📦 Packages Exp'Air Medical

Cette structure **pré-monorepo** contient les packages partagés entre les applications Web et Mobile (future architecture Turborepo).

## 📁 Structure

```
packages/
├── ui/                    # Design System
│   ├── colors.ts          # Palette de couleurs
│   ├── spacing.ts         # Tokens d'espacement
│   ├── components/        # Composants UI réutilisables
│   │   └── SecureInput.tsx
│   └── index.ts           # Exports centralisés
│
├── shared/                # Logique métier partagée
│   ├── types.ts           # Types TypeScript
│   ├── validation.ts      # Validation des données
│   ├── security/          # Sécurité
│   │   └── input-guard.ts # Protection XSS, SQL injection
│   ├── hooks/             # Hooks React réutilisables
│   │   ├── useAuth.ts
│   │   ├── useTelemetry.ts
│   │   └── useAlerts.ts
│   └── index.ts           # Exports centralisés
│
└── README.md              # Ce fichier
```

---

## 🎨 Package `ui` - Design System

### Objectif
Composants visuels et tokens de design partagés entre Web et Mobile.

### Contenu

#### 1. **Couleurs** (`colors.ts`)
Palette Apple-inspired : Bleu nuit, Turquoise, Lavande

```tsx
import { colors } from './packages/ui';

const primaryColor = colors.primary[500]; // #007AFF
const accentColor = colors.accent[500];   // #875FFF
```

#### 2. **Espacement** (`spacing.ts`)
System 8px cohérent avec Apple Human Interface Guidelines

```tsx
import { spacing, radius, shadows } from './packages/ui';

const cardStyle = {
  padding: spacing.base,     // 16px
  borderRadius: radius.lg,   // 12px
  boxShadow: shadows.md,
};
```

#### 3. **Composants**

##### `SecureInput.tsx`
Input sécurisé avec validation automatique

```tsx
import { SecureInput } from './packages/ui';

<SecureInput
  type="email"
  value={email}
  onChange={(val, isValid) => setEmail(val)}
  showValidation
  required
/>
```

### Compatibilité
- ✅ **Web** : React + Tailwind CSS
- 🔄 **Mobile** : React Native + NativeWind (à venir)

---

## 🔐 Package `shared` - Logique Métier

### Objectif
Code métier réutilisable, indépendant de l'UI.

### Contenu

#### 1. **Types** (`types.ts`)
Types TypeScript pour le domaine médical

```tsx
import type { Patient, TelemetryData, Alert } from './packages/shared';

const patient: Patient = {
  id: '123',
  email: 'patient@example.com',
  role: 'patient',
  medical_id: 'MED-001',
  consent_data_sharing: true,
};
```

Types disponibles :
- `UserProfile`, `Patient`, `Medecin`, `Admin`
- `TelemetryData` (données PPC)
- `Alert`, `Intervention`
- `Stock`, `Billing`
- `BusinessMetrics`

#### 2. **Validation** (`validation.ts`)
Validation des données médicales (RGPD + HDS compliant)

```tsx
import { 
  validateEmail, 
  validateNIR, 
  validatePassword,
  rateLimiter 
} from './packages/shared';

// Email
const emailResult = validateEmail('test@example.com');
// { valid: true }

// NIR (Sécurité Sociale)
const nirResult = validateNIR('1 89 12 75 123 456 78');
// { valid: true }

// Mot de passe sécurisé
const pwdResult = validatePassword('MyStr0ng!Passw0rd');
// { valid: true, strength: 100 }

// Rate limiting
if (!rateLimiter.canProceed('login', 5, 60000)) {
  alert('Trop de tentatives');
}
```

#### 3. **Sécurité** (`security/input-guard.ts`)
Protection contre XSS, SQL injection, Command injection

```tsx
import { 
  sanitizeInput, 
  guardInput, 
  InputGuard 
} from './packages/shared';

// Sanitization XSS
const userInput = '<script>alert("XSS")</script>Hello';
const safe = sanitizeInput(userInput);
// "<script>...</script>Hello"

// Validation complète
const { valid, sanitized, error } = guardInput(email, 'email');
```

#### 4. **Hooks Métier** (`hooks/`)

##### `useAuth.ts`
Gestion de l'authentification

```tsx
import { useAuth } from './packages/shared';

const { 
  user, 
  isLoading, 
  isAuthenticated, 
  login, 
  logout,
  hasRole 
} = useAuth();

// Connexion
const { success, error } = await login(email, password);

// Vérification rôle
if (hasRole('medecin')) {
  // Accès médecin
}
```

##### `useTelemetry.ts`
Données télémétrie PPC

```tsx
import { useTelemetry } from './packages/shared';

const {
  latestData,
  stats,
  detectAnomalies,
  refresh
} = useTelemetry({
  patientId: '123',
  autoRefresh: true,
  refreshInterval: 30000 // 30 secondes
});

const { avgIAH, avgObservance } = stats();
const anomalies = detectAnomalies();
// ['IAH critique (>30)', 'Observance très faible (<50%)']
```

##### `useAlerts.ts`
Alertes temps réel

```tsx
import { useAlerts } from './packages/shared';

const {
  alerts,
  criticalCount,
  markAsResolved,
  dismissAlert
} = useAlerts({
  patientId: '123',
  realtime: true
});

// Résoudre une alerte
await markAsResolved(alertId, 'Intervention effectuée');
```

---

## 🚀 Utilisation

### Import depuis le code existant

```tsx
// Avant migration monorepo
import { colors } from './packages/ui/colors';
import { useAuth } from './packages/shared/hooks/useAuth';
import type { Patient } from './packages/shared/types';
```

### Après migration monorepo (futur)

```tsx
// Imports simplifiés avec workspaces
import { colors, SecureInput } from '@expair/ui';
import { useAuth, useTelemetry, validateEmail } from '@expair/shared';
import type { Patient, Alert } from '@expair/shared';
```

---

## 🧪 Tests

Chaque package devrait avoir ses propres tests :

```bash
# Structure future
packages/
├── ui/
│   ├── __tests__/
│   │   └── SecureInput.test.tsx
│   └── package.json
├── shared/
│   ├── __tests__/
│   │   ├── validation.test.ts
│   │   ├── hooks/useAuth.test.ts
│   │   └── security/input-guard.test.ts
│   └── package.json
```

---

## 📚 Documentation

- [PACKAGES_USAGE_EXAMPLES.md](/PACKAGES_USAGE_EXAMPLES.md) - Exemples d'utilisation détaillés
- [MONOREPO_MIGRATION_GUIDE.md](/MONOREPO_MIGRATION_GUIDE.md) - Guide de migration Turborepo

---

## ✅ Avantages de cette Architecture

### 1. **Réutilisabilité**
- ✅ Logique métier partagée entre Web et Mobile
- ✅ Design system cohérent
- ✅ Types TypeScript centralisés

### 2. **Maintenabilité**
- ✅ Code DRY (Don't Repeat Yourself)
- ✅ Modifications centralisées (1 change = tous les apps)
- ✅ Tests unitaires isolés

### 3. **Sécurité**
- ✅ Validation centralisée
- ✅ Sanitization XSS automatique
- ✅ Rate limiting intégré

### 4. **Performance**
- ✅ Tree-shaking (seul le code utilisé est bundlé)
- ✅ Code splitting optimisé
- ✅ Cache partagé entre apps

### 5. **Developer Experience**
- ✅ Autocomplétion TypeScript
- ✅ Imports simplifiés
- ✅ Hot reload cross-package

---

## 🔄 Prochaines Étapes

1. **Migrer vers Turborepo** (voir [MONOREPO_MIGRATION_GUIDE.md](/MONOREPO_MIGRATION_GUIDE.md))
2. **Créer l'app mobile** React Native + Expo
3. **Adapter les composants UI** pour React Native (NativeWind)
4. **Configurer CI/CD** GitHub Actions
5. **Déployer** (Vercel pour web, EAS pour mobile)

---

## 🛠️ Maintenance

### Ajouter un nouveau composant UI

```bash
# 1. Créer le fichier
packages/ui/components/NewComponent.tsx

# 2. Exporter dans index.ts
export { NewComponent } from './components/NewComponent';

# 3. Utiliser dans l'app
import { NewComponent } from './packages/ui';
```

### Ajouter un nouveau hook

```bash
# 1. Créer le fichier
packages/shared/hooks/useNewFeature.ts

# 2. Exporter dans index.ts
export { useNewFeature } from './hooks/useNewFeature';

# 3. Utiliser dans l'app
import { useNewFeature } from './packages/shared';
```

---

## 📞 Support

Pour toute question sur l'utilisation des packages :
1. Consulter [PACKAGES_USAGE_EXAMPLES.md](/PACKAGES_USAGE_EXAMPLES.md)
2. Lire la documentation inline (commentaires JSDoc dans le code)
3. Vérifier les types TypeScript (IntelliSense)

---

**Dernière mise à jour** : 4 décembre 2024
**Version** : 1.0.0
**Statut** : ✅ Prêt pour production & migration monorepo
