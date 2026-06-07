/**
 * ============================================
 * GÉNÉRATEUR DE RAPPORTS PDF
 * ============================================
 * 
 * Génère des rapports PDF professionnels pour les patients et médecins
 * Sauvegarde dans Supabase Storage (/reports)
 * 
 * Utilise une approche HTML → PDF simple et efficace
 */

// ============================================
// TYPES
// ============================================

export interface ReportData {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    birth_date?: string;
    ipp?: string;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  telemetry: Array<{
    date: string;
    ahi: number;
    usage_hours: number;
    leak_rate: number;
    pressure: number;
  }>;
  device: {
    brand: string;
    model: string;
    serial_number: string;
  };
  prescriber?: {
    name: string;
    specialty?: string;
  };
}

// ============================================
// GÉNÉRATEUR HTML POUR PDF
// ============================================

export function generateReportHTML(data: ReportData): string {
  const { patient, period, telemetry, device, prescriber } = data;

  // Calcul des statistiques
  const totalDays = telemetry.length;
  const avgAHI = telemetry.reduce((sum, t) => sum + t.ahi, 0) / totalDays;
  const avgUsage = telemetry.reduce((sum, t) => sum + t.usage_hours, 0) / totalDays;
  const avgLeak = telemetry.reduce((sum, t) => sum + t.leak_rate, 0) / totalDays;
  const compliance = telemetry.filter(t => t.usage_hours >= 4).length / totalDays * 100;

  // Évaluation clinique
  const clinicalStatus = avgAHI < 5 ? '✓ Excellent' : avgAHI < 15 ? '⚠ Modéré' : '✗ Sous-optimal';
  const complianceStatus = compliance >= 70 ? '✓ Observance satisfaisante' : '⚠ Observance insuffisante';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport PPC - ${patient.last_name} ${patient.first_name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1A1A1A;
      background: white;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #007AFF;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo {
      font-size: 24pt;
      font-weight: bold;
      color: #007AFF;
    }
    
    .report-type {
      text-align: right;
      color: #5C5C5C;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 600;
      color: #007AFF;
      border-bottom: 2px solid #D9D5CC;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .info-item {
      display: flex;
      padding: 10px;
      background: #F2F0EB;
      border-radius: 8px;
    }
    
    .info-label {
      font-weight: 600;
      color: #5C5C5C;
      min-width: 120px;
    }
    
    .info-value {
      color: #1A1A1A;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 28pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 9pt;
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #D9D5CC;
    }
    
    th {
      background: #F2F0EB;
      font-weight: 600;
      color: #1A1A1A;
    }
    
    tr:hover {
      background: #F9F9F9;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    .status-good {
      background: #D1F4E0;
      color: #00875A;
    }
    
    .status-warning {
      background: #FFF4CE;
      color: #B34000;
    }
    
    .status-critical {
      background: #FFE5E5;
      color: #D32F2F;
    }
    
    .clinical-summary {
      background: #F2F0EB;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #007AFF;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #D9D5CC;
      text-align: center;
      color: #5C5C5C;
      font-size: 9pt;
    }
    
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <!-- PAGE 1 : EN-TÊTE & RÉSUMÉ -->
  <div class="header">
    <div class="logo">Medical</div>
    <div class="report-type">
      <div style="font-weight: bold; color: #1A1A1A;">RAPPORT DE SUIVI PPC</div>
      <div>Période : ${new Date(period.start_date).toLocaleDateString('fr-FR')} - ${new Date(period.end_date).toLocaleDateString('fr-FR')}</div>
      <div>Généré le : ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

  <!-- INFORMATIONS PATIENT -->
  <div class="section">
    <div class="section-title">📋 Informations Patient</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Nom :</span>
        <span class="info-value">${patient.last_name.toUpperCase()} ${patient.first_name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date de naissance :</span>
        <span class="info-value">${patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('fr-FR') : 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">IPP :</span>
        <span class="info-value">${patient.ipp || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">ID Patient :</span>
        <span class="info-value">${patient.id.slice(0, 8)}</span>
      </div>
    </div>
  </div>

  <!-- INFORMATIONS APPAREIL -->
  <div class="section">
    <div class="section-title">🔧 Appareil PPC</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Marque :</span>
        <span class="info-value">${device.brand}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Modèle :</span>
        <span class="info-value">${device.model}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Numéro de série :</span>
        <span class="info-value">${device.serial_number}</span>
      </div>
      ${prescriber ? `
      <div class="info-item">
        <span class="info-label">Prescripteur :</span>
        <span class="info-value">${prescriber.name}</span>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- STATISTIQUES CLÉS -->
  <div class="section">
    <div class="section-title">📊 Statistiques Globales (${totalDays} jours)</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${avgAHI.toFixed(1)}</div>
        <div class="stat-label">AHI Moyen<br>(événements/h)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgUsage.toFixed(1)}h</div>
        <div class="stat-label">Usage Moyen<br>(heures/nuit)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${compliance.toFixed(0)}%</div>
        <div class="stat-label">Observance<br>(≥4h/nuit)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgLeak.toFixed(1)}</div>
        <div class="stat-label">Fuites Moyennes<br>(L/min)</div>
      </div>
    </div>
  </div>

  <!-- ÉVALUATION CLINIQUE -->
  <div class="section">
    <div class="section-title">🩺 Évaluation Clinique</div>
    <div class="clinical-summary">
      <p style="margin-bottom: 15px;"><strong>État du traitement :</strong> ${clinicalStatus}</p>
      <p style="margin-bottom: 15px;"><strong>Observance :</strong> ${complianceStatus}</p>
      <p style="margin-bottom: 0;"><strong>Recommandation :</strong> 
        ${avgAHI < 5 && compliance >= 70 
          ? 'Poursuivre le traitement dans les conditions actuelles.' 
          : avgAHI < 15 
          ? 'Suivi rapproché recommandé. Vérifier l\'ajustement du masque.' 
          : 'Consultation médicale recommandée pour ajustement du traitement.'}
      </p>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PAGE 2 : DONNÉES DÉTAILLÉES -->
  <div class="section">
    <div class="section-title">📈 Données Quotidiennes Détaillées</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>AHI</th>
          <th>Usage (h)</th>
          <th>Fuites (L/min)</th>
          <th>Pression (cmH2O)</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${telemetry.map(day => {
          const status = day.ahi < 5 ? 'good' : day.ahi < 15 ? 'warning' : 'critical';
          const statusText = day.ahi < 5 ? 'Optimal' : day.ahi < 15 ? 'Modéré' : 'Critique';
          return `
            <tr>
              <td>${new Date(day.date).toLocaleDateString('fr-FR')}</td>
              <td>${day.ahi.toFixed(1)}</td>
              <td>${day.usage_hours.toFixed(1)}</td>
              <td>${day.leak_rate.toFixed(1)}</td>
              <td>${day.pressure.toFixed(1)}</td>
              <td><span class="status-badge status-${status}">${statusText}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- SIGNATURE -->
  <div class="signature">
    <div style="margin-bottom: 10px; color: #5C5C5C;">Signature électronique</div>
    <div style="font-weight: bold; color: #007AFF;">Medical</div>
    <div style="color: #5C5C5C; font-size: 9pt;">Prestataire de santé à domicile agréé</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>Ce document a été généré automatiquement par la plateforme Medical.</p>
    <p>Confidentiel - Usage strictement médical - Ne pas diffuser</p>
    <p style="margin-top: 10px;">Medical - 123 Avenue de la Santé, 75000 Paris - Tél : 01 23 45 67 89</p>
  </div>
</body>
</html>
  `;
}

// ============================================
// FONCTION : Conversion HTML → PDF (Placeholder)
// ============================================
// Note : En production, utiliser Puppeteer, Playwright ou un service comme PDFShift

export async function convertHTMLToPDF(html: string): Promise<Uint8Array> {
  // Pour l'environnement Deno, on simule la génération PDF
  // En production, utiliser une vraie librairie ou service
  
  console.log('[PDF GENERATOR] Converting HTML to PDF...');
  console.log(`[PDF GENERATOR] HTML length: ${html.length} chars`);
  
  // Simuler un PDF minimal (header PDF)
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Rapport PPC - Medical) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF`;
  
  const fullPDF = pdfHeader + pdfContent;
  
  return new TextEncoder().encode(fullPDF);
}
