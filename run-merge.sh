#!/bin/bash
set -e

M1="/tmp/medical1"
M2="/tmp/medical2"

echo "=== STEP 1: CLEANUP ==="

# 1a: Delete .md and .txt files in src/ (except Attributions.md)
cd "$M2/src"
count=0
for f in *.md *.txt; do
  if [ -f "$f" ] && [ "$f" != "Attributions.md" ]; then
    rm -f "$f"
    count=$((count + 1))
  fi
done
echo "  Deleted $count .md/.txt files from src/"

# 1b: Delete test/debug pages
cd "$M2/src/pages"
for f in TestAlerts.tsx TestAlertStats.tsx TestAlertsConnection.tsx TestIntelligence.tsx TestIoTSystem.tsx TestNotificationBadge.tsx TestPatientList.tsx FixAuth.tsx ForceLogout.tsx AideAuth.tsx InitDemo.tsx SupabaseSetup.tsx; do
  if [ -f "$f" ]; then
    rm -f "$f"
    echo "  Deleted page: $f"
  fi
done

# 1c: Delete test/debug components
cd "$M2/src/components"
for f in AutoInitAccounts.tsx AuthStatusChecker.tsx DatabaseSetupRequired.tsx SetupStatusToast.tsx SetupWarningBanner.tsx AuthErrorBanner.tsx; do
  if [ -f "$f" ]; then
    rm -f "$f"
    echo "  Deleted component: $f"
  fi
done

echo ""
echo "=== STEP 2: COPY M1 COMPONENTS ==="

# 2a: Copy patient components
mkdir -p "$M2/src/components/patient"
for f in ScoreGlobal.tsx MaNuit.tsx MonSuivi.tsx MesProgres.tsx Assistance.tsx; do
  if [ -f "$M1/src/components/patient/$f" ]; then
    if [ -f "$M2/src/components/patient/$f" ]; then
      cp "$M1/src/components/patient/$f" "$M2/src/components/patient/M1_$f"
      echo "  Copied patient/M1_$f (conflict)"
    else
      cp "$M1/src/components/patient/$f" "$M2/src/components/patient/$f"
      echo "  Copied patient/$f"
    fi
  fi
done

# 2b: Copy widgets
mkdir -p "$M2/src/components/widgets"
for f in AlertBanner.tsx CircularProgress.tsx StatsCard.tsx StatusBadge.tsx Timeline.tsx; do
  if [ -f "$M1/src/components/widgets/$f" ]; then
    cp "$M1/src/components/widgets/$f" "$M2/src/components/widgets/$f"
    echo "  Copied widgets/$f"
  fi
done

# 2c: Copy exclusive pages
for f in Solutions.tsx Technology.tsx; do
  if [ -f "$M1/src/pages/$f" ]; then
    cp "$M1/src/pages/$f" "$M2/src/pages/$f"
    echo "  Copied pages/$f"
  fi
done

echo ""
echo "=== STEP 6: WHITE-LABEL ==="

# White-label all source files
cd "$M2"
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i \
  -e "s/Exp'Air Medical/la plateforme/g" \
  -e "s/ExpAir/la plateforme/g" \
  -e "s/Exp Air/la plateforme/g" \
  -e "s/Exp'Air/la plateforme/g" \
  -e "s/Elia Medical/la plateforme/g" \
  -e "s/Elia Médical/la plateforme/g" \
  -e "s/expairmedical\.fr/plateforme.fr/g" \
  -e "s/expair-medical\.fr/plateforme.fr/g" \
  -e "s/eliamedical\.fr/plateforme.fr/g" \
  -e "s/la plateforme Medical/la plateforme/g" \
  -e "s/la plateforme la plateforme/la plateforme/g" \
  {} \;

# Also update package.json
sed -i "s/Exp'Air Medical/MedConnect/g" package.json
sed -i "s/Site Web la plateforme/MedConnect/g" package.json

echo "  White-label complete"

echo ""
echo "=== STEP 7: BUILD ==="
cd "$M2"
npm install 2>&1 | tail -5
echo "  npm install done"
npx vite build 2>&1
echo ""
echo "=== ALL DONE ==="
