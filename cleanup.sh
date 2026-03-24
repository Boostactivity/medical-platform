#!/bin/bash
# Step 1: Delete .md and .txt files in src/ (except Attributions.md)
cd "C:/Users/adelm/AppData/Local/Temp/medical2/src"
for f in *.md *.txt; do
  if [ "$f" != "Attributions.md" ] && [ -f "$f" ]; then
    rm "$f"
  fi
done
echo "Step 1a: Deleted md/txt files"

# Step 1b: Delete test/debug pages
cd "C:/Users/adelm/AppData/Local/Temp/medical2/src/pages"
rm -f TestAlerts.tsx TestAlertStats.tsx TestAlertsConnection.tsx TestIntelligence.tsx TestIoTSystem.tsx TestNotificationBadge.tsx TestPatientList.tsx
rm -f FixAuth.tsx ForceLogout.tsx AideAuth.tsx InitDemo.tsx SupabaseSetup.tsx
echo "Step 1b: Deleted test/debug pages"

# Step 1c: Delete test/debug components
cd "C:/Users/adelm/AppData/Local/Temp/medical2/src/components"
rm -f AutoInitAccounts.tsx AuthStatusChecker.tsx DatabaseSetupRequired.tsx SetupStatusToast.tsx SetupWarningBanner.tsx AuthErrorBanner.tsx
echo "Step 1c: Deleted test/debug components"
