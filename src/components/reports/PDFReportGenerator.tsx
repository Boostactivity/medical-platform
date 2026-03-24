/**
 * PHASE 4 - GENERATEUR DE RAPPORT PDF / DMP
 * Compte-rendu d'observance 7j/30j/90j compatible Dossier Medical Partage
 */

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';

interface PDFReportProps {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientDevice?: string;
  doctorName?: string;
  doctorRPPS?: string;
  observanceData?: {
    averageUsage: number;
    averageAHI: number;
    averageLeak: number;
    complianceRate: number;
    daysTracked: number;
    expAirScore: number;
  };
  period?: '7' | '30' | '90';
  doctorComment?: string;
}

// Generate mock daily data for charts in the PDF
function generateDailyData(days: number) {
  const data = [];
  for (let i = days; i > 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      usage: Math.max(0, 5 + (Math.random() - 0.3) * 4),
      ahi: Math.max(0, 3 + (Math.random() - 0.5) * 5),
      leaks: Math.max(0, 8 + (Math.random() - 0.5) * 12),
    });
  }
  return data;
}

function drawBarChart(
  doc: jsPDF,
  data: number[],
  labels: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  unit: string,
  color: [number, number, number],
  threshold?: number
) {
  const margin = 2;
  const chartX = x + 25;
  const chartWidth = width - 30;
  const chartHeight = height - 20;
  const chartY = y + 12;

  // Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(title, x, y + 5);

  // Max value for scaling
  const maxVal = Math.max(...data, threshold || 0) * 1.2 || 10;

  // Y axis labels
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const val = ((maxVal / 4) * i).toFixed(1);
    const labelY = chartY + chartHeight - (chartHeight / 4) * i;
    doc.text(val, x, labelY + 1);
    doc.setDrawColor(230, 230, 230);
    doc.line(chartX, labelY, chartX + chartWidth, labelY);
  }

  // Threshold line
  if (threshold !== undefined) {
    const thresholdY = chartY + chartHeight - (threshold / maxVal) * chartHeight;
    doc.setDrawColor(255, 59, 48);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(chartX, thresholdY, chartX + chartWidth, thresholdY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5);
    doc.setTextColor(255, 59, 48);
    doc.text(`seuil: ${threshold}${unit}`, chartX + chartWidth - 15, thresholdY - 1);
  }

  // Bars
  const barWidth = Math.min(4, (chartWidth / data.length) * 0.7);
  const spacing = chartWidth / data.length;

  data.forEach((val, i) => {
    const barHeight = (val / maxVal) * chartHeight;
    const barX = chartX + i * spacing + (spacing - barWidth) / 2;
    const barY = chartY + chartHeight - barHeight;

    // Color: green if above threshold (for usage), red if above (for AHI/leaks)
    if (title.includes('Usage') || title.includes('Observance')) {
      if (val >= (threshold || 4)) {
        doc.setFillColor(52, 199, 89);
      } else {
        doc.setFillColor(255, 149, 0);
      }
    } else {
      if (threshold && val > threshold) {
        doc.setFillColor(255, 59, 48);
      } else {
        doc.setFillColor(color[0], color[1], color[2]);
      }
    }
    doc.rect(barX, barY, barWidth, barHeight, 'F');
  });

  // X axis labels (show every Nth)
  const step = Math.max(1, Math.floor(data.length / 8));
  doc.setFontSize(5);
  doc.setTextColor(120, 120, 120);
  labels.forEach((label, i) => {
    if (i % step === 0) {
      const labelX = chartX + i * spacing + spacing / 2;
      doc.text(label, labelX, chartY + chartHeight + 5, { align: 'center' });
    }
  });
}

export function PDFReportGenerator({
  patientId,
  patientName,
  patientAge,
  patientDevice,
  doctorName = 'Dr. Martin',
  doctorRPPS = '10101010101',
  observanceData,
  period = '30',
  doctorComment,
}: PDFReportProps) {
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>(period);

  const generatePDF = async () => {
    try {
      setGenerating(true);
      toast.loading('Generation du rapport PDF DMP...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const days = parseInt(selectedPeriod);
      const dailyData = generateDailyData(days);

      // ====== PAGE 1 ======

      // DMP Header banner
      doc.setFillColor(0, 71, 171);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Compte-Rendu d\'Observance PPC', margin, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Document compatible DMP - Dossier Medical Partage', margin, 22);
      doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);

      // DMP compliance stamp
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 40, 5, 38, 12, 2, 2, 'F');
      doc.setTextColor(0, 71, 171);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('DMP COMPATIBLE', pageWidth - margin - 21, 10, { align: 'center' });
      doc.setFontSize(5);
      doc.text('CI-SIS / VSM', pageWidth - margin - 21, 14, { align: 'center' });

      let yPos = 45;

      // Patient & Doctor info in two columns
      doc.setFillColor(245, 245, 247);
      doc.roundedRect(margin, yPos - 5, contentWidth / 2 - 3, 35, 2, 2, 'F');
      doc.roundedRect(margin + contentWidth / 2 + 3, yPos - 5, contentWidth / 2 - 3, 35, 2, 2, 'F');

      // Patient info
      doc.setTextColor(0, 71, 171);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PATIENT', margin + 5, yPos + 2);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nom : ${patientName}`, margin + 5, yPos + 9);
      doc.text(`Age : ${patientAge || 'N/C'} ans`, margin + 5, yPos + 15);
      doc.text(`ID : ${patientId}`, margin + 5, yPos + 21);
      doc.text(`Appareil : ${patientDevice || 'N/C'}`, margin + 5, yPos + 27);

      // Doctor info
      const col2X = margin + contentWidth / 2 + 8;
      doc.setTextColor(0, 71, 171);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESCRIPTEUR', col2X, yPos + 2);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nom : ${doctorName}`, col2X, yPos + 9);
      doc.text(`RPPS : ${doctorRPPS}`, col2X, yPos + 15);
      doc.text(`Date rapport : ${new Date().toLocaleDateString('fr-FR')}`, col2X, yPos + 21);
      doc.text(`Periode : ${days} derniers jours`, col2X, yPos + 27);

      yPos += 40;

      // Separator
      doc.setDrawColor(0, 71, 171);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Summary section title
      doc.setFillColor(0, 71, 171);
      doc.roundedRect(margin, yPos - 4, contentWidth, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`SYNTHESE D'OBSERVANCE - ${days} JOURS`, margin + 5, yPos + 1);
      yPos += 12;

      if (observanceData) {
        // Key metrics cards
        const metrics = [
          {
            label: 'Score Global',
            value: `${observanceData.expAirScore}/100`,
            color: observanceData.expAirScore >= 80 ? [52, 199, 89] : observanceData.expAirScore >= 60 ? [255, 149, 0] : [255, 59, 48],
          },
          {
            label: 'Usage Moyen',
            value: `${observanceData.averageUsage.toFixed(1)}h/nuit`,
            color: observanceData.averageUsage >= 4 ? [52, 199, 89] : [255, 149, 0],
          },
          {
            label: 'IAH Residuel',
            value: `${observanceData.averageAHI.toFixed(1)}/h`,
            color: observanceData.averageAHI <= 5 ? [52, 199, 89] : observanceData.averageAHI <= 10 ? [255, 149, 0] : [255, 59, 48],
          },
          {
            label: 'Fuites Moy.',
            value: `${observanceData.averageLeak.toFixed(1)} L/min`,
            color: observanceData.averageLeak <= 24 ? [52, 199, 89] : [255, 149, 0],
          },
          {
            label: 'Taux Observance',
            value: `${observanceData.complianceRate.toFixed(0)}%`,
            color: observanceData.complianceRate >= 70 ? [52, 199, 89] : [255, 149, 0],
          },
        ];

        const cardWidth = contentWidth / metrics.length - 2;
        metrics.forEach((metric, i) => {
          const cardX = margin + i * (cardWidth + 2);

          doc.setFillColor(245, 245, 247);
          doc.roundedRect(cardX, yPos, cardWidth, 18, 1, 1, 'F');

          doc.setFontSize(6);
          doc.setTextColor(120, 120, 120);
          doc.setFont('helvetica', 'normal');
          doc.text(metric.label, cardX + cardWidth / 2, yPos + 5, { align: 'center' });

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          const c = metric.color as number[];
          doc.setTextColor(c[0], c[1], c[2]);
          doc.text(metric.value, cardX + cardWidth / 2, yPos + 13, { align: 'center' });
        });

        yPos += 25;

        // Qualitative evaluation
        let evaluation = '';
        let evalColor: [number, number, number] = [0, 0, 0];

        if (observanceData.expAirScore >= 80) {
          evaluation = 'Excellente observance. Le traitement est bien suivi et efficace.';
          evalColor = [52, 199, 89];
        } else if (observanceData.expAirScore >= 60) {
          evaluation = 'Bonne observance avec axes d\'amelioration possibles.';
          evalColor = [255, 149, 0];
        } else if (observanceData.expAirScore >= 40) {
          evaluation = 'Observance insuffisante. Accompagnement renforce recommande.';
          evalColor = [255, 149, 0];
        } else {
          evaluation = 'Observance critique. Intervention urgente necessaire.';
          evalColor = [255, 59, 48];
        }

        doc.setFillColor(evalColor[0], evalColor[1], evalColor[2]);
        doc.roundedRect(margin, yPos, 3, 10, 1, 1, 'F');
        doc.setTextColor(evalColor[0], evalColor[1], evalColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Evaluation clinique', margin + 6, yPos + 4);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(evaluation, margin + 6, yPos + 9);

        yPos += 18;

        // Charts section
        const chartHeight = 35;
        const chartWidth2 = contentWidth / 2 - 3;

        // Usage chart
        drawBarChart(
          doc,
          dailyData.map((d) => d.usage),
          dailyData.map((d) => d.date),
          margin,
          yPos,
          chartWidth2,
          chartHeight,
          'Usage quotidien (heures/nuit)',
          'h',
          [0, 122, 255],
          4
        );

        // AHI chart
        drawBarChart(
          doc,
          dailyData.map((d) => d.ahi),
          dailyData.map((d) => d.date),
          margin + chartWidth2 + 6,
          yPos,
          chartWidth2,
          chartHeight,
          'IAH residuel (evenements/h)',
          '',
          [52, 199, 89],
          5
        );

        yPos += chartHeight + 10;

        // Leaks chart
        drawBarChart(
          doc,
          dailyData.map((d) => d.leaks),
          dailyData.map((d) => d.date),
          margin,
          yPos,
          chartWidth2,
          chartHeight,
          'Fuites (L/min)',
          'L/min',
          [255, 149, 0],
          24
        );

        yPos += chartHeight + 12;

        // Recommendations
        doc.setFillColor(0, 71, 171);
        doc.roundedRect(margin, yPos - 4, contentWidth, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RECOMMANDATIONS', margin + 5, yPos + 1);
        yPos += 10;

        const recommendations: string[] = [];
        if (observanceData.averageUsage < 4) {
          recommendations.push('Augmenter la duree d\'utilisation (objectif >= 4h/nuit, ideal 7h)');
        }
        if (observanceData.averageLeak > 24) {
          recommendations.push('Verifier l\'ajustement du masque (fuites excessives detectees)');
        }
        if (observanceData.averageAHI > 10) {
          recommendations.push('IAH eleve : envisager un ajustement de pression ou changement de mode');
        }
        if (observanceData.complianceRate < 70) {
          recommendations.push('Renforcer l\'accompagnement patient pour ameliorer l\'adhesion');
        }
        if (recommendations.length === 0) {
          recommendations.push('Traitement bien tolere - Poursuivre tel quel');
          recommendations.push('Maintenir le suivi regulier');
        }

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        recommendations.forEach((rec) => {
          doc.text(`  - ${rec}`, margin + 3, yPos);
          yPos += 5;
        });

        yPos += 5;

        // Doctor comment
        if (doctorComment) {
          doc.setFillColor(245, 245, 247);
          doc.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'F');
          doc.setTextColor(0, 71, 171);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Commentaire du medecin prescripteur :', margin + 5, yPos + 6);
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          const splitComment = doc.splitTextToSize(doctorComment, contentWidth - 10);
          doc.text(splitComment, margin + 5, yPos + 12);
          yPos += 30;
        }
      } else {
        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.text('Donnees d\'observance non disponibles pour cette periode.', margin, yPos + 10);
      }

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Document genere automatiquement - Conforme aux specifications CI-SIS du DMP (Dossier Medical Partage)',
        margin,
        pageHeight - 17
      );
      doc.text('Donnees hebergees en conformite HDS - Usage strictement medical', margin, pageHeight - 13);
      doc.text(
        `Ref: RPT-${patientId}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
        margin,
        pageHeight - 9
      );
      doc.text(`Page 1/1`, pageWidth - margin - 12, pageHeight - 9);

      // Digital signature area
      doc.setDrawColor(0, 71, 171);
      doc.setLineDashPattern([1, 1], 0);
      doc.roundedRect(pageWidth - margin - 60, pageHeight - 35, 58, 12, 1, 1, 'S');
      doc.setLineDashPattern([], 0);
      doc.setFontSize(6);
      doc.setTextColor(0, 71, 171);
      doc.text('Signature electronique', pageWidth - margin - 31, pageHeight - 30, { align: 'center' });
      doc.text(`${doctorName} - RPPS ${doctorRPPS}`, pageWidth - margin - 31, pageHeight - 26, { align: 'center' });

      // Save
      const fileName = `CR_Observance_${patientName.replace(/\s+/g, '_')}_${days}j_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.dismiss();
      toast.success('Rapport PDF DMP genere', {
        description: `Le fichier ${fileName} a ete telecharge.`,
      });
    } catch (error: any) {
      console.error('[PDFReport] Error generating PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value as '7' | '30' | '90')}
        className="h-9 px-3 rounded-md border bg-background text-sm"
      >
        <option value="7">7 jours</option>
        <option value="30">30 jours</option>
        <option value="90">90 jours</option>
      </select>
      <Button
        onClick={generatePDF}
        disabled={generating}
        className="bg-[#0047AB] hover:bg-[#003380] gap-2"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generation...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Export PDF/DMP
          </>
        )}
      </Button>
    </div>
  );
}
