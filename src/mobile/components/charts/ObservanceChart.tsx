import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme, VictoryLine } from 'victory-native';
import { SleepData } from '../../database/models/SleepData';

/**
 * Composant ObservanceChart
 * 
 * Affiche un graphique en barres de l'observance mensuelle.
 * Calcule automatiquement le pourcentage de nuits conformes par mois.
 * 
 * Features :
 * - Barres colorées selon le taux d'observance
 * - Ligne d'objectif à 80%
 * - Labels mois
 * - Statistiques résumées
 * - Vue par mois sur les 12 derniers mois
 */

interface ObservanceChartProps {
  data: SleepData[];
  targetCompliance?: number; // Pourcentage cible (défaut: 80%)
  showTarget?: boolean;
  height?: number;
}

export function ObservanceChart({ 
  data, 
  targetCompliance = 80,
  showTarget = true,
  height = 250,
}: ObservanceChartProps) {
  // ============================================
  // PRÉPARATION DES DONNÉES
  // ============================================

  // Grouper par mois
  const monthlyData = groupByMonth(data);
  
  // Calculer l'observance par mois
  const chartData = monthlyData.map(month => ({
    x: month.label,
    y: month.complianceRate,
    color: getComplianceColor(month.complianceRate),
    compliantNights: month.compliantNights,
    totalNights: month.totalNights,
  }));

  // Ligne cible
  const targetLine = chartData.map(d => ({ x: d.x, y: targetCompliance }));

  // ============================================
  // STATISTIQUES
  // ============================================

  const avgCompliance = chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length;
  const bestMonth = chartData.reduce((max, d) => d.y > max.y ? d : max, chartData[0]);
  const monthsAboveTarget = chartData.filter(d => d.y >= targetCompliance).length;

  // ============================================
  // RESPONSIVE
  // ============================================

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* Header avec statistiques */}
      <View style={styles.header}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{avgCompliance.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Moyenne</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{monthsAboveTarget}/{chartData.length}</Text>
          <Text style={styles.statLabel}>Mois ≥ {targetCompliance}%</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{bestMonth.y.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Meilleur</Text>
        </View>
      </View>

      {/* Graphique */}
      <VictoryChart
        width={chartWidth}
        height={height}
        theme={VictoryTheme.material}
        domainPadding={{ x: 20 }}
      >
        {/* Axes */}
        <VictoryAxis
          style={{
            axis: { stroke: '#e2e8f0' },
            tickLabels: { fontSize: 10, fill: '#64748b', angle: -45, textAnchor: 'end' },
            grid: { stroke: 'none' },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: '#e2e8f0' },
            tickLabels: { fontSize: 10, fill: '#64748b' },
            grid: { stroke: '#f1f5f9', strokeDasharray: '4, 4' },
          }}
          tickFormat={(t) => `${t}%`}
          domain={[0, 100]}
        />

        {/* Ligne cible */}
        {showTarget && (
          <VictoryLine
            data={targetLine}
            style={{
              data: {
                stroke: '#5eb3d6',
                strokeWidth: 2,
                strokeDasharray: '6, 6',
              },
            }}
          />
        )}

        {/* Barres d'observance */}
        <VictoryBar
          data={chartData}
          style={{
            data: {
              fill: ({ datum }) => datum.color,
            },
          }}
          cornerRadius={{ top: 4 }}
        />
      </VictoryChart>

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4ade80' }]} />
            <Text style={styles.legendText}>Excellent (≥90%)</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#5eb3d6' }]} />
            <Text style={styles.legendText}>Bon (70-90%)</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
            <Text style={styles.legendText}>Moyen (50-70%)</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Faible (<50%)</Text>
          </View>
        </View>
        {showTarget && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine]} />
              <Text style={styles.legendText}>Objectif ({targetCompliance}%)</Text>
            </View>
          </View>
        )}
      </View>

      {/* Interprétation */}
      <View style={[styles.interpretation, { backgroundColor: getInterpretationColor(avgCompliance).bg }]}>
        <Text style={[styles.interpretationText, { color: getInterpretationColor(avgCompliance).text }]}>
          {getInterpretationMessage(avgCompliance, targetCompliance, monthsAboveTarget, chartData.length)}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// HELPERS
// ============================================

interface MonthData {
  label: string;
  month: number;
  year: number;
  totalNights: number;
  compliantNights: number;
  complianceRate: number;
}

function groupByMonth(data: SleepData[]): MonthData[] {
  const monthsMap = new Map<string, MonthData>();
  
  data.forEach(sleep => {
    const date = new Date(sleep.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, {
        label: getMonthLabel(date),
        month: date.getMonth(),
        year: date.getFullYear(),
        totalNights: 0,
        compliantNights: 0,
        complianceRate: 0,
      });
    }
    
    const monthData = monthsMap.get(monthKey)!;
    monthData.totalNights++;
    if (sleep.isCompliant) {
      monthData.compliantNights++;
    }
  });
  
  // Calculer les taux et trier
  const months = Array.from(monthsMap.values())
    .map(month => ({
      ...month,
      complianceRate: (month.compliantNights / month.totalNights) * 100,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  
  // Limiter aux 12 derniers mois
  return months.slice(-12);
}

function getMonthLabel(date: Date): string {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[date.getMonth()];
}

function getComplianceColor(rate: number): string {
  if (rate >= 90) return '#4ade80'; // green - excellent
  if (rate >= 70) return '#5eb3d6'; // blue - good
  if (rate >= 50) return '#fbbf24'; // yellow - average
  return '#ef4444'; // red - poor
}

function getInterpretationColor(rate: number): { bg: string; text: string } {
  if (rate >= 90) return { bg: '#f0fdf4', text: '#15803d' };
  if (rate >= 70) return { bg: '#f0f9ff', text: '#0369a1' };
  if (rate >= 50) return { bg: '#fefce8', text: '#ca8a04' };
  return { bg: '#fef2f2', text: '#dc2626' };
}

function getInterpretationMessage(
  avgCompliance: number,
  targetCompliance: number,
  monthsAboveTarget: number,
  totalMonths: number
): string {
  if (avgCompliance >= 90) {
    return `✅ Excellente observance ! Vous maintenez une moyenne de ${avgCompliance.toFixed(0)}% sur ${totalMonths} mois. Continuez ainsi !`;
  } else if (avgCompliance >= targetCompliance) {
    return `👍 Bonne observance avec ${avgCompliance.toFixed(0)}% en moyenne. ${monthsAboveTarget} mois sur ${totalMonths} atteignent l'objectif.`;
  } else if (avgCompliance >= 50) {
    return `⚠️ Observance moyenne (${avgCompliance.toFixed(0)}%). Essayez d'atteindre ${targetCompliance}% pour une efficacité optimale du traitement.`;
  } else {
    return `🚨 Observance faible (${avgCompliance.toFixed(0)}%). Consultez votre médecin pour identifier les obstacles au traitement.`;
  }
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  legend: {
    marginTop: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLine: {
    width: 20,
    height: 2,
    backgroundColor: '#5eb3d6',
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  interpretation: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  interpretationText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

/**
 * NOTES SUR LE COMPOSANT :
 * 
 * 1. Calcul de l'observance mensuelle :
 *    - Groupement par mois
 *    - Pourcentage de nuits conformes (≥4h)
 *    - Moyenne sur 12 mois maximum
 * 
 * 2. Codes couleur :
 *    - Vert : ≥90% (excellent)
 *    - Bleu : 70-90% (bon)
 *    - Jaune : 50-70% (moyen)
 *    - Rouge : <50% (faible)
 * 
 * 3. Ligne d'objectif :
 *    - Par défaut : 80% (recommandation CPAM)
 *    - Personnalisable via props
 * 
 * 4. Statistiques :
 *    - Moyenne globale
 *    - Nombre de mois atteignant l'objectif
 *    - Meilleur mois
 * 
 * 5. Interprétation :
 *    - Message contextualisé selon la moyenne
 *    - Encouragements ou conseils
 * 
 * 6. Performance :
 *    - Victory Native : rendu natif
 *    - 60 FPS même avec 12 barres
 *    - Groupement efficace
 * 
 * 7. Utilisation :
 *    ```tsx
 *    <ObservanceChart
 *      data={sleepData}
 *      targetCompliance={80}
 *      showTarget={true}
 *      height={250}
 *    />
 *    ```
 */
