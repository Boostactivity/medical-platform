# Migrations Supabase - Exp'Air Medical

## 📋 Liste des migrations

### 001 - Initial Schema (Existant)
- Tables de base : users, sleep_data, alerts, interventions, audit_logs
- Système RLS
- Données de démonstration

### 002 - Device Management (Nouveau ✨)
- Gestion du parc matériel (devices, device_assignments)
- Système de consommables et commandes automatiques
- Logs de maintenance
- Système d'alertes avancé (alerts_queue)
- Gamification (patient_achievements, patient_stats)

## 🚀 Comment appliquer les migrations

### Via l'interface Supabase (Recommandé)
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet Exp'Air Medical
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de `002_device_management.sql`
5. Cliquer sur **Run**

### Via CLI Supabase (Si configuré)
```bash
supabase db push
```

## ✅ Vérification post-migration

Exécuter cette requête pour vérifier que tout est OK :

```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'devices', 
  'device_assignments', 
  'consumables', 
  'consumable_orders', 
  'maintenance_logs', 
  'alerts_queue', 
  'patient_achievements', 
  'patient_stats'
)
ORDER BY table_name;
```

Résultat attendu : 8 tables

## 🧪 Données de test

La migration 002 ajoute automatiquement :
- 5 appareils de démonstration
- 9 types de consommables en stock
- 1 appareil assigné au patient testpatient@demo.fr
- Stats et achievements pour le patient démo

## 🔒 Sécurité (RLS)

Toutes les tables ont Row Level Security activé avec politiques :
- **Patients** : Voient uniquement leurs propres données
- **Médecins** : Voient les données de leur panel_code
- **Admins** : Accès complet

## 📊 Schéma relationnel

```
users (existant)
  ↓
patient_stats (1-to-1)
patient_achievements (1-to-many)
device_assignments (many-to-many avec devices)
consumable_orders (many-to-many avec consumables)
alerts_queue (many-to-1)

devices
  ↓
maintenance_logs (1-to-many)
```

## 🆘 En cas d'erreur

Si la migration échoue :
1. Vérifier que la migration 001 a été appliquée
2. Vérifier que l'extension uuid-ossp est activée
3. Consulter les logs d'erreur dans Supabase Dashboard > Logs
4. Supprimer les tables en erreur et re-exécuter :
   ```sql
   DROP TABLE IF EXISTS alerts_queue, patient_achievements, patient_stats, 
     maintenance_logs, consumable_orders, consumables, device_assignments, devices CASCADE;
   ```
