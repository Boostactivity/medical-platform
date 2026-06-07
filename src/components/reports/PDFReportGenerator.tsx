/**
 * PHASE 3.8 - GÉNÉRATEUR DE RAPPORT PDF
 * Compte-rendu mensuel d'observance pour le médecin
 */

import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';

interface PDFReportProps {
  patientId: string;
  patientName: string;
  observanceData?: {
    averageUsage: number;
    averageAHI: number;
    averageLeak: number;
    complianceRate: number;
    daysTracked: number;
    medicalScore: number;
  };
}

export function PDFReportGenerator({ patientId, patientName, observanceData }: PDFReportProps) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    try {
      setGenerating(true);
      toast.loading('Génération du rapport PDF...');

      // Créer un nouveau document PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // En-tête avec logo (simulé)
      doc.setFillColor(0, 122, 255);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("Medical", margin, 20);
      
      doc.setFontSize(12);
      doc.text('Compte-rendu d\'observance', margin, 30);

      // Informations patient
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text('Informations Patient', margin, 55);
      
      doc.setFontSize(11);
      doc.text(`Patient : ${patientName}`, margin, 65);
      doc.text(`ID : ${patientId}`, margin, 72);
      doc.text(`Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`, margin, 79);
      doc.text(`Période analysée : 30 derniers jours`, margin, 86);

      // Ligne de séparation
      doc.setDrawColor(210, 210, 215);
      doc.line(margin, 92, pageWidth - margin, 92);

      // Résumé des données
      doc.setFontSize(16);
      doc.text('Résumé de l\'observance', margin, 105);

      if (observanceData) {
        // Score Medical
        doc.setFontSize(14);
        doc.setTextColor(0, 122, 255);
        doc.text(`Score Medical : ${observanceData.medicalScore}/100`, margin, 120);

        // Indicateurs clés
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        const metrics = [
          { label: 'Usage moyen', value: `${observanceData.averageUsage.toFixed(1)} h/nuit`, y: 135 },
          { label: 'IAH moyen', value: `${observanceData.averageAHI.toFixed(1)} événements/h`, y: 145 },
          { label: 'Fuites moyennes', value: `${observanceData.averageLeak.toFixed(1)} L/min`, y: 155 },
          { label: 'Taux d\'observance', value: `${observanceData.complianceRate.toFixed(0)}%`, y: 165 },
          { label: 'Jours suivis', value: `${observanceData.daysTracked} jours`, y: 175 },
        ];

        metrics.forEach(metric => {
          doc.setFont(undefined, 'bold');
          doc.text(metric.label + ' :', margin, metric.y);
          doc.setFont(undefined, 'normal');
          doc.text(metric.value, margin + 55, metric.y);
        });

        // Évaluation qualitative
        doc.setFontSize(16);
        doc.text('Évaluation', margin, 195);
        
        doc.setFontSize(11);
        let evaluation = '';
        let evaluationColor: [number, number, number] = [0, 0, 0];
        
        if (observanceData.medicalScore >= 80) {
          evaluation = 'Excellente observance. Le traitement est bien suivi.';
          evaluationColor = [52, 199, 89];
        } else if (observanceData.medicalScore >= 60) {
          evaluation = 'Bonne observance. Quelques améliorations possibles.';
          evaluationColor = [255, 149, 0];
        } else if (observanceData.medicalScore >= 40) {
          evaluation = 'Observance moyenne. Un accompagnement est recommandé.';
          evaluationColor = [255, 149, 0];
        } else {
          evaluation = 'Faible observance. Intervention urgente nécessaire.';
          evaluationColor = [255, 59, 48];
        }

        doc.setTextColor(evaluationColor[0], evaluationColor[1], evaluationColor[2]);
        doc.text(evaluation, margin, 205);

        // Recommandations
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text('Recommandations', margin, 225);
        
        doc.setFontSize(10);
        const recommendations: string[] = [];
        
        if (observanceData.averageUsage < 4) {
          recommendations.push('• Augmenter la durée d\'utilisation (objectif : 7h/nuit minimum)');
        }
        if (observanceData.averageLeak > 24) {
          recommendations.push('• Vérifier l\'ajustement du masque (fuites excessives détectées)');
        }
        if (observanceData.averageAHI > 10) {
          recommendations.push('• IAH élevé : envisager un ajustement de la pression');
        }
        if (observanceData.complianceRate < 70) {
          recommendations.push('• Renforcer l\'accompagnement pour améliorer l\'adhésion au traitement');
        }
        if (recommendations.length === 0) {
          recommendations.push('• Continuer le traitement tel quel');
          recommendations.push('• Maintenir un suivi régulier');
        }

        let yPos = 235;
        recommendations.forEach(rec => {
          doc.text(rec, margin, yPos);
          yPos += 7;
        });

      } else {
        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.text('Données d\'observance non disponibles pour cette période.', margin, 120);
      }

      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Ce document a été généré automatiquement par Exp\'Air Medical.', margin, pageHeight - 20);
      doc.text(`Document confidentiel - Usage strictement médical`, margin, pageHeight - 15);
      doc.text(`Page 1/1`, pageWidth - margin - 15, pageHeight - 10);

      // Générer le fichier
      const fileName = `Rapport_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.dismiss();
      toast.success('Rapport PDF généré', {
        description: `Le fichier ${fileName} a été téléchargé.`,
      });

    } catch (error: any) {
      console.error('[PDFReport] Error generating PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
    >
      {generating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Télécharger le rapport PDF
        </>
      )}
    </Button>
  );
}
