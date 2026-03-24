// Complete merge script - Steps 1, 2, and file copies
import fs from 'fs';
import path from 'path';

const M1 = process.platform === 'win32'
  ? 'C:\\Users\\adelm\\AppData\\Local\\Temp\\medical1'
  : '/tmp/medical1';
const M2 = process.platform === 'win32'
  ? 'C:\\Users\\adelm\\AppData\\Local\\Temp\\medical2'
  : '/tmp/medical2';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============ STEP 1: CLEANUP ============
console.log('=== STEP 1: CLEANUP ===');

// 1a: Delete .md and .txt files in src/
const srcDir = path.join(M2, 'src');
let deletedCount = 0;
for (const f of fs.readdirSync(srcDir)) {
  if ((f.endsWith('.md') || f.endsWith('.txt')) && f !== 'Attributions.md') {
    try { fs.unlinkSync(path.join(srcDir, f)); deletedCount++; } catch(e) {}
  }
}
console.log(`  Deleted ${deletedCount} .md/.txt files from src/`);

// 1b: Delete test/debug pages
const testPages = [
  'TestAlerts.tsx', 'TestAlertStats.tsx', 'TestAlertsConnection.tsx',
  'TestIntelligence.tsx', 'TestIoTSystem.tsx', 'TestNotificationBadge.tsx',
  'TestPatientList.tsx', 'FixAuth.tsx', 'ForceLogout.tsx', 'AideAuth.tsx',
  'InitDemo.tsx', 'SupabaseSetup.tsx'
];
const pagesDir = path.join(srcDir, 'pages');
for (const p of testPages) {
  const fp = path.join(pagesDir, p);
  try { if (fs.existsSync(fp)) { fs.unlinkSync(fp); console.log(`  Deleted page: ${p}`); } } catch(e) {}
}

// 1c: Delete test/debug components
const testComps = [
  'AutoInitAccounts.tsx', 'AuthStatusChecker.tsx', 'DatabaseSetupRequired.tsx',
  'SetupStatusToast.tsx', 'SetupWarningBanner.tsx', 'AuthErrorBanner.tsx'
];
const compDir = path.join(srcDir, 'components');
for (const c of testComps) {
  const fp = path.join(compDir, c);
  try { if (fs.existsSync(fp)) { fs.unlinkSync(fp); console.log(`  Deleted component: ${c}`); } } catch(e) {}
}

// ============ STEP 2: COPY M1 COMPONENTS ============
console.log('\n=== STEP 2: COPY M1 COMPONENTS ===');

// 2a: Copy patient components (M1 has superior design)
const patientSrc = path.join(M1, 'src', 'components', 'patient');
const patientDst = path.join(M2, 'src', 'components', 'patient');
ensureDir(patientDst);
for (const f of ['ScoreGlobal.tsx', 'MaNuit.tsx', 'MonSuivi.tsx', 'MesProgres.tsx', 'Assistance.tsx']) {
  const src = path.join(patientSrc, f);
  const dst = path.join(patientDst, f);
  if (fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      // Keep M2 version, copy M1 with prefix
      fs.copyFileSync(src, path.join(patientDst, 'M1_' + f));
      console.log(`  Copied patient/M1_${f} (conflict avoided)`);
    } else {
      fs.copyFileSync(src, dst);
      console.log(`  Copied patient/${f}`);
    }
  }
}

// 2b: Copy widgets from M1
const widgetsSrc = path.join(M1, 'src', 'components', 'widgets');
const widgetsDst = path.join(M2, 'src', 'components', 'widgets');
ensureDir(widgetsDst);
for (const f of ['AlertBanner.tsx', 'CircularProgress.tsx', 'StatsCard.tsx', 'StatusBadge.tsx', 'Timeline.tsx']) {
  const src = path.join(widgetsSrc, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(widgetsDst, f));
    console.log(`  Copied widgets/${f}`);
  }
}

// 2c: Copy exclusive M1 pages
for (const f of ['Solutions.tsx', 'Technology.tsx']) {
  const src = path.join(M1, 'src', 'pages', f);
  const dst = path.join(pagesDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  Copied pages/${f}`);
  }
}

// ============ STEP 6: WHITE-LABEL (partial - text replacement) ============
console.log('\n=== STEP 6: WHITE-LABEL ===');

function whitelabelFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Replace brand names with generic text
    content = content.replace(/Exp'Air Medical/g, 'la plateforme');
    content = content.replace(/Exp'Air/g, 'la plateforme');
    content = content.replace(/ExpAir/g, 'la plateforme');
    content = content.replace(/Exp Air/g, 'la plateforme');
    content = content.replace(/Elia Medical/g, 'la plateforme');
    content = content.replace(/Elia Médical/g, 'la plateforme');
    content = content.replace(/Elia/g, 'la plateforme');
    content = content.replace(/expairmedical\.fr/g, 'contact@plateforme.fr');
    content = content.replace(/expair-medical\.fr/g, 'contact@plateforme.fr');
    content = content.replace(/eliamedical\.fr/g, 'contact@plateforme.fr');

    // Fix double "la plateforme la plateforme" or "la plateforme Medical"
    content = content.replace(/la plateforme Medical/g, 'la plateforme');
    content = content.replace(/la plateforme Médical/g, 'la plateforme');
    content = content.replace(/la plateforme la plateforme/g, 'la plateforme');

    // Fix grammar: "Pourquoi la plateforme" instead of "Pourquoi la plateforme ?"
    // "Choisir la plateforme" is fine
    // "contact@la plateforme.fr" -> fix email
    content = content.replace(/contact@la plateforme\.fr/g, 'contact@plateforme.fr');
    content = content.replace(/dpo@la plateforme\.fr/g, 'dpo@plateforme.fr');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch(e) { return false; }
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkDir(fullPath, callback);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css') || entry.name.endsWith('.json')) {
      callback(fullPath);
    }
  }
}

let whitelabeled = 0;
walkDir(path.join(M2, 'src'), (fp) => {
  if (whitelabelFile(fp)) whitelabeled++;
});
// Also do package.json
whitelabelFile(path.join(M2, 'package.json'));
console.log(`  White-labeled ${whitelabeled} files`);

console.log('\n=== DONE ===');
console.log('Steps 3 (globals.css), 4 (pages), 5 (Header/Footer) handled by Write tool.');
console.log('Step 7 (build) needs: cd /tmp/medical2 && npm install && npx vite build');
