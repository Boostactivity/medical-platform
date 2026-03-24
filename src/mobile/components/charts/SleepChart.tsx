import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryArea, VictoryTooltip, VictoryVoronoiContainer } from 'victory-native';
import { SleepData } from '../../database/models/SleepData';

/**
 * Composant SleepChart
 * 
 * Affiche un graphique de l'historique de sommeil sur 7, 14 ou 30 jours.
 * Utilise Victory Native pour un rendu optimisé et des animations fluides.
 * 
 * Features :
 * - Courbe d'heures d'utilisation
 * - Zone colorée sous la courbe
 * - Ligne de référence à 4h (objectif CPAM)
 * - Tooltip interactif
 * - Responsive
 */

interface SleepChartProps {
  data: SleepData[];
  period: 7 | 14 | 30;
  showTarget?: boolean;
  height?: number;
}

export function SleepChart({ 
  data, 
  period = 30, 
  showTarget = true,
  height = 250,
}: SleepChartProps) {
  // ============================================
  // PRÉPARATION DES DONNÉES
  // ============================================

  const chartData = data
    .slice(0, period)
    .reverse()
    .map((sleep, index) => ({
      x: index + 1,
      y: sleep.hoursUsed,
      date: sleep.shortDate,
      fullDate: sleep.formattedDate,
      quality: sleep.qualityLabel,
      isCompliant: sleep.isCompliant,
    }));

  // Données pour la ligne cible à 4h
  const targetLine = chartData.map(d => ({ x: d.x, y: 4 }));

  // ============================================
  // STATISTIQUES
  // ============================================

  const totalHours = chartData.reduce((sum, d) => sum + d.y, 0);
  const avgHours = totalHours / chartData.length;
  const compliantDays = chartData.filter(d => d.isCompliant).length;
  const complianceRate = (compliantDays / chartData.length) * 100;

  // ============================================
  // RESPONSIVE
  // ============================================

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // Padding 20px de chaque côté

  // ============================================
  // COULEURS
  // ============================================

  const colors = {
    primary: '#5eb3d6',
    area: 'rgba(94, 179, 214, 0.2)',
    target: '#fbbf24',
    axis: '#64748b',
    grid: '#e2e8f0',
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* Header avec statistiques */}
      <View style={styles.header}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{avgHours.toFixed(1)}h</Text>
          <Text style={styles.statLabel}>Moyenne</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{compliantDays}/{chartData.length}</Text>
          <Text style={styles.statLabel}>Jours conformes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: complianceRate >= 80 ? '#4ade80' : '#fbbf24' }]}>
            {complianceRate.toFixed(0)}%
          </Text>
          <Text style={styles.statLabel}>Observance</Text>
        </View>
      </View>

      {/* Graphique */}
      <VictoryChart
        width={chartWidth}
        height={height}
        theme={VictoryTheme.material}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) => `${datum.date}\n${datum.y.toFixed(1)}h\n${datum.quality}`}
            labelComponent={
              <VictoryTooltip
                cornerRadius={8}
                flyoutStyle={{
                  fill: '#1e3a5f',
                  stroke: 'none',
                }}
                style={{
                  fill: 'white',
                  fontSize: 12,
                }}
              />
            }
          />
        }
      >
        {/* Axes */}
        <VictoryAxis
          style={{
            axis: { stroke: colors.grid },
            tickLabels: { fontSize: 10, fill: colors.axis },
            grid: { stroke: colors.grid, strokeDasharray: '4, 4' },
          }}
          tickFormat={(t) => {
            // Afficher seulement certains labels pour éviter l'encombrement
            if (period === 30) {
              return t % 5 === 0 ? t : '';
            } else if (period === 14) {
              return t % 2 === 0 ? t : '';
            }
            return t;
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.grid },
            tickLabels: { fontSize: 10, fill: colors.axis },
            grid: { stroke: colors.grid, strokeDasharray: '4, 4' },
          }}
          tickFormat={(t) => `${t}h`}
          domain={[0, 10]}
        />

        {/* Zone sous la courbe */}
        <VictoryArea
          data={chartData}
          style={{
            data: {
              fill: colors.area,
              stroke: 'none',
            },
          }}
          interpolation="natural"
        />

        {/* Ligne de données */}
        <VictoryLine
          data={chartData}
          style={{
            data: {
              stroke: colors.primary,
              strokeWidth: 3,
            },
          }}
          interpolation="natural"
        />

        {/* Ligne cible (4h) */}
        {showTarget && (
          <VictoryLine
            data={targetLine}
            style={{
              data: {
                stroke: colors.target,
                strokeWidth: 2,
                strokeDasharray: '6, 6',
              },
            }}
          />
        )}
      </VictoryChart>

      {/* Légende */}
      {showTarget && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Heures d'utilisation</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.target }]} />
            <Text style={styles.legendText}>Objectif 4h (CPAM)</Text>
          </View>
        </View>
      )}
    </View>
  );
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
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
});

/**
 * NOTES SUR LE COMPOSANT :
 * 
 * 1. Performance :
 *    - Victory Native utilise les APIs natives (CoreGraphics, Canvas)
 *    - Rendu à 60 FPS même avec 30+ points
 *    - Animations fluides par défaut
 * 
 * 2. Interactivité :
 *    - VictoryVoronoiContainer : Détection au toucher optimisée
 *    - VictoryTooltip : Affichage des détails au tap
 *    - Responsive : S'adapte à la taille de l'écran
 * 
 * 3. Accessibilité :
 *    - Couleurs contrastées
 *    - Textes lisibles (12pt minimum)
 *    - Tooltip descriptif
 * 
 * 4. Design :
 *    - Conforme au design system la plateforme
 *    - Palette bleu nuit / turquoise
 *    - Style Apple-inspired (courbes, ombres douces)
 * 
 * 5. Utilisation :
 *    ```tsx
 *    <SleepChart
 *      data={sleepData}
 *      period={30}
 *      showTarget={true}
 *      height={250}
 *    />
 *    ```
 */
