# 🚀 Quick Start - Packages Exp'Air Medical

**Temps de lecture** : 5 minutes  
**Niveau** : Débutant à Intermédiaire

---

## 📦 Qu'est-ce que c'est ?

Ces packages contiennent **du code réutilisable** partagé entre l'application web et la future application mobile.

### 2 Packages Principaux

```
packages/
├── ui/        🎨 Design System (couleurs, composants)
└── shared/    🔐 Logique métier (validation, hooks, types)
```

---

## 🎯 Import en 3 Secondes

### Avant (sans packages)
```tsx
// ❌ Imports compliqués
import { validateEmail } from '../../../utils/validation';
import { colors } from '../../../styles/theme';
```

### Après (avec packages)
```tsx
// ✅ Imports simples
import { validateEmail } from './packages/shared';
import { colors } from './packages/ui';
```

---

## 🎨 Package UI - Exemples Visuels

### 1. Couleurs

```tsx
import { colors } from './packages/ui';

// Utilisation simple
<div style={{ backgroundColor: colors.primary[500] }}>
  Bouton Primaire (#007AFF)
</div>

<div style={{ backgroundColor: colors.accent[500] }}>
  Bouton Accent (#875FFF)
</div>

<div style={{ color: colors.medical.iah }}>
  ⚠️ IAH Critique (#FF3B30)
</div>
```

**Palette complète** :
- `colors.primary` - Bleu nuit (#007AFF)
- `colors.secondary` - Turquoise (#00C3CD)
- `colors.accent` - Lavande (#875FFF)
- `colors.success` - Vert (#34C759)
- `colors.warning` - Orange (#FF9500)
- `colors.error` - Rouge (#FF3B30)

### 2. Espacement

```tsx
import { spacing, radius, shadows } from './packages/ui';

<div style={{
  padding: spacing.base,        // 16px
  margin: spacing.lg,           // 20px
  borderRadius: radius.lg,      // 12px
  boxShadow: shadows.md,        // Ombre douce
}}>
  Card avec espacement cohérent
</div>
```

### 3. Composant SecureInput

```tsx
import { SecureInput } from './packages/ui';
import { useState } from 'react';

function MyForm() {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);

  return (
    <SecureInput
      label="Email"
      type="email"
      value={email}
      onChange={(val, valid) => {
        setEmail(val);
        setIsValid(valid);
      }}
      showValidation
      required
      placeholder="exemple@email.com"
    />
  );
}
```

**Résultat** :
- ✅ Validation automatique
- ✅ Sanitization XSS
- ✅ Message d'erreur si invalide
- ✅ Astérisque rouge si requis

---

## 🔐 Package Shared - Exemples Pratiques

### 1. Validation Email

```tsx
import { validateEmail } from './packages/shared';

const result = validateEmail('test@example.com');

if (result.valid) {
  console.log('✅ Email valide');
} else {
  console.error('❌', result.error);
  // "Format d'email invalide"
}
```

### 2. Validation Mot de Passe

```tsx
import { validatePassword } from './packages/shared';

const result = validatePassword('MyStr0ng!Passw0rd');

console.log(result);
// {
//   valid: true,
//   strength: 100,
//   error: undefined
// }

const weak = validatePassword('123');
console.log(weak);
// {
//   valid: false,
//   strength: 0,
//   error: "Minimum 12 caractères, Une majuscule minimum, ..."
// }
```

### 3. Protection XSS

```tsx
import { sanitizeHTML } from './packages/shared';

const userInput = '<script>alert("XSS")</script>Hello';
const safe = sanitizeHTML(userInput);

console.log(safe);
// "<script>alert("XSS")</script>Hello"
```

### 4. Rate Limiting (Anti-Spam)

```tsx
import { rateLimiter } from './packages/shared';

function handleLogin() {
  // Max 5 tentatives par minute
  if (!rateLimiter.canProceed('login', 5, 60000)) {
    alert('⏳ Trop de tentatives. Patientez 1 minute.');
    return;
  }
  
  // Procéder au login
  performLogin();
}
```

---

## 🩺 Hooks Métier - Exemples

### 1. useAuth - Authentification

```tsx
import { useAuth } from './packages/shared';

function LoginPage() {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout
  } = useAuth();

  const handleLogin = async () => {
    const { success, error } = await login(email, password);
    
    if (success) {
      navigate('/dashboard');
    } else {
      alert(error);
    }
  };

  if (isAuthenticated) {
    return <div>Bonjour {user.email} !</div>;
  }

  return (
    <button onClick={handleLogin} disabled={isLoading}>
      {isLoading ? 'Connexion...' : 'Se connecter'}
    </button>
  );
}
```

### 2. useTelemetry - Données PPC

```tsx
import { useTelemetry } from './packages/shared';

function PatientDashboard() {
  const {
    latestData,
    stats,
    detectAnomalies,
    refresh
  } = useTelemetry({
    patientId: 'patient-123',
    autoRefresh: true,
    refreshInterval: 30000 // 30 secondes
  });

  const anomalies = detectAnomalies();
  const { avgIAH, avgObservance } = stats();

  return (
    <div>
      <h2>Dernières données</h2>
      <p>IAH : {latestData?.iah}</p>
      <p>Observance : {latestData?.observance}%</p>
      
      <h3>Moyennes (30 jours)</h3>
      <p>IAH moyen : {avgIAH.toFixed(1)}</p>
      <p>Observance moyenne : {avgObservance.toFixed(1)}%</p>
      
      {anomalies.length > 0 && (
        <div className="bg-red-50 p-4 rounded">
          <h4>⚠️ Anomalies détectées :</h4>
          <ul>
            {anomalies.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      
      <button onClick={refresh}>🔄 Actualiser</button>
    </div>
  );
}
```

### 3. useAlerts - Alertes Temps Réel

```tsx
import { useAlerts } from './packages/shared';

function AlertsQueue() {
  const {
    alerts,
    criticalCount,
    markAsResolved,
    refresh
  } = useAlerts({
    status: 'pending',
    realtime: true // Auto-refresh toutes les 10s
  });

  return (
    <div>
      <div className="bg-red-100 p-4 rounded mb-4">
        <h3>🚨 Alertes Critiques : {criticalCount}</h3>
      </div>

      {alerts.map(alert => (
        <div key={alert.id} className="border p-4 rounded mb-2">
          <h4>{alert.title}</h4>
          <p>{alert.description}</p>
          
          <button
            onClick={() => markAsResolved(alert.id, 'Traité')}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            ✅ Résoudre
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 📱 Types TypeScript - Exemples

```tsx
import type { Patient, TelemetryData, Alert } from './packages/shared';

// Type Patient
const patient: Patient = {
  id: '123',
  email: 'patient@example.com',
  role: 'patient',
  first_name: 'Jean',
  last_name: 'Dupont',
  medical_id: 'MED-001',
  nir: '1 89 12 75 123 456 78',
  consent_data_sharing: true,
  consent_telemedicine: true,
  created_at: new Date().toISOString(),
};

// Type TelemetryData
const telemetry: TelemetryData = {
  id: '456',
  patient_id: '123',
  device_serial: 'CPAP-12345',
  recorded_at: new Date().toISOString(),
  usage_hours: 7.5,
  iah: 12.3,
  observance: 85,
  leak_rate: 15,
  pressure_min: 4,
  pressure_max: 20,
  pressure_avg: 12,
  created_at: new Date().toISOString(),
};

// Type Alert
const alert: Alert = {
  id: '789',
  patient_id: '123',
  type: 'low_observance',
  severity: 'high',
  title: 'Observance faible',
  description: 'Observance < 70% depuis 3 jours',
  status: 'pending',
  created_at: new Date().toISOString(),
};
```

---

## 🎯 Cas d'Usage Complet : Formulaire de Login Sécurisé

```tsx
import { SecureInput } from './packages/ui';
import { useAuth, rateLimiter } from './packages/shared';
import { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Rate limiting (max 5 tentatives/minute)
    if (!rateLimiter.canProceed('login', 5, 60000)) {
      alert('Trop de tentatives. Patientez 1 minute.');
      return;
    }

    // 2. Validation
    if (!isEmailValid) {
      alert('Email invalide');
      return;
    }

    // 3. Login
    const { success, error } = await login(email, password);
    
    if (success) {
      navigate('/dashboard');
    } else {
      alert(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <h1 className="text-2xl">Connexion</h1>

      {/* Input Email avec validation auto */}
      <SecureInput
        label="Email"
        type="email"
        value={email}
        onChange={(val, isValid) => {
          setEmail(val);
          setIsEmailValid(isValid);
        }}
        showValidation
        required
      />

      {/* Input Password */}
      <SecureInput
        label="Mot de passe"
        type="password"
        value={password}
        onChange={(val) => setPassword(val)}
        required
      />

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Bouton Submit */}
      <button
        type="submit"
        disabled={isLoading || !isEmailValid}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg"
      >
        {isLoading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
```

**Sécurité appliquée** :
- ✅ Validation email automatique
- ✅ Sanitization XSS
- ✅ Rate limiting (5 tentatives/min)
- ✅ Messages d'erreur sécurisés
- ✅ Bouton désactivé pendant loading

---

## 🧪 Tester Rapidement

### Test 1 : Validation Email
```tsx
import { validateEmail } from './packages/shared';

console.log(validateEmail('test@example.com'));
// { valid: true }

console.log(validateEmail('invalid'));
// { valid: false, error: "Format d'email invalide" }
```

### Test 2 : Couleurs
```tsx
import { colors } from './packages/ui';

console.log(colors.primary[500]);
// "#007AFF"

console.log(colors.medical.iah);
// "#FF3B30"
```

### Test 3 : Sanitization XSS
```tsx
import { sanitizeHTML } from './packages/shared';

const malicious = '<script>alert("XSS")</script>';
console.log(sanitizeHTML(malicious));
// "<script>alert("XSS")</script>"
```

---

## 📚 Documentation Complète

Pour aller plus loin :
- [packages/README.md](./README.md) - Documentation complète
- [PACKAGES_USAGE_EXAMPLES.md](../PACKAGES_USAGE_EXAMPLES.md) - Exemples avancés
- [PHASE_4_MONOREPO_PREP.md](../PHASE_4_MONOREPO_PREP.md) - Phase 4 complète

---

## ❓ Questions Fréquentes

### Q : Puis-je utiliser ces packages maintenant ?
**R :** Oui ! Ils fonctionnent immédiatement dans votre code.

### Q : Dois-je migrer vers monorepo ?
**R :** Non, c'est optionnel. Les packages fonctionnent dans l'environnement actuel.

### Q : Comment importer un package ?
**R :** Simplement :
```tsx
import { colors } from './packages/ui';
import { useAuth } from './packages/shared';
```

### Q : Les packages sont-ils compatibles mobile ?
**R :** Oui ! La logique métier (`shared`) est 100% compatible React Native. Le design system (`ui`) nécessitera une adaptation légère avec NativeWind.

---

**Prêt à coder ? Copiez les exemples ci-dessus et testez ! 🚀**
