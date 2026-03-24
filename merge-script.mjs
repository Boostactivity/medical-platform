import fs from 'fs';
import path from 'path';

const M1 = 'C:/Users/adelm/AppData/Local/Temp/medical1';
const M2 = 'C:/Users/adelm/AppData/Local/Temp/medical2';

// Step 1a: Delete .md and .txt files in src/
const srcDir = path.join(M2, 'src');
const files = fs.readdirSync(srcDir);
let deletedCount = 0;
for (const f of files) {
  if ((f.endsWith('.md') || f.endsWith('.txt')) && f !== 'Attributions.md') {
    fs.unlinkSync(path.join(srcDir, f));
    deletedCount++;
  }
}
console.log(`Step 1a: Deleted ${deletedCount} .md/.txt files from src/`);

// Step 1b: Delete test/debug pages
const testPages = [
  'TestAlerts.tsx', 'TestAlertStats.tsx', 'TestAlertsConnection.tsx',
  'TestIntelligence.tsx', 'TestIoTSystem.tsx', 'TestNotificationBadge.tsx',
  'TestPatientList.tsx', 'FixAuth.tsx', 'ForceLogout.tsx', 'AideAuth.tsx',
  'InitDemo.tsx', 'SupabaseSetup.tsx'
];
const pagesDir = path.join(srcDir, 'pages');
for (const p of testPages) {
  const fp = path.join(pagesDir, p);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`  Deleted page: ${p}`);
  }
}

// Step 1c: Delete test/debug components
const testComponents = [
  'AutoInitAccounts.tsx', 'AuthStatusChecker.tsx', 'DatabaseSetupRequired.tsx',
  'SetupStatusToast.tsx', 'SetupWarningBanner.tsx', 'AuthErrorBanner.tsx'
];
const compDir = path.join(srcDir, 'components');
for (const c of testComponents) {
  const fp = path.join(compDir, c);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`  Deleted component: ${c}`);
  }
}
console.log('Step 1 complete: Cleanup done');

// Step 2: Copy M1 components to M2

// 2a: Copy patient components from M1
const patientSrc = path.join(M1, 'src/components/patient');
const patientDst = path.join(M2, 'src/components/patient');
if (!fs.existsSync(patientDst)) fs.mkdirSync(patientDst, { recursive: true });
const patientFiles = ['ScoreGlobal.tsx', 'MaNuit.tsx', 'MonSuivi.tsx', 'MesProgres.tsx', 'Assistance.tsx'];
for (const f of patientFiles) {
  const src = path.join(patientSrc, f);
  const dst = path.join(patientDst, f);
  if (fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      // Don't overwrite - create with M1 prefix
      const newName = 'M1_' + f;
      fs.copyFileSync(src, path.join(patientDst, newName));
      console.log(`  Copied patient/${newName} (avoiding conflict)`);
    } else {
      fs.copyFileSync(src, dst);
      console.log(`  Copied patient/${f}`);
    }
  }
}

// 2b: Copy widgets from M1
const widgetsSrc = path.join(M1, 'src/components/widgets');
const widgetsDst = path.join(M2, 'src/components/widgets');
if (!fs.existsSync(widgetsDst)) fs.mkdirSync(widgetsDst, { recursive: true });
const widgetFiles = ['AlertBanner.tsx', 'CircularProgress.tsx', 'StatsCard.tsx', 'StatusBadge.tsx', 'Timeline.tsx'];
for (const f of widgetFiles) {
  const src = path.join(widgetsSrc, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(widgetsDst, f));
    console.log(`  Copied widgets/${f}`);
  }
}

// 2c: Copy exclusive M1 pages (Solutions, Technology)
const solSrc = path.join(M1, 'src/pages/Solutions.tsx');
const techSrc = path.join(M1, 'src/pages/Technology.tsx');
if (fs.existsSync(solSrc)) {
  fs.copyFileSync(solSrc, path.join(pagesDir, 'Solutions.tsx'));
  console.log('  Copied pages/Solutions.tsx');
}
if (fs.existsSync(techSrc)) {
  fs.copyFileSync(techSrc, path.join(pagesDir, 'Technology.tsx'));
  console.log('  Copied pages/Technology.tsx');
}

console.log('Step 2 complete: M1 components copied');
console.log('Steps 3-6 will be handled by file writes...');
