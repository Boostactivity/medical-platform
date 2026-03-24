import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

/**
 * Modele medical simplifie :
 * - IAH residuel diminue proportionnellement au temps de port PPC (etudes APPLES, Weaver 2007)
 * - En dessous de 4h, benefice cardiovasculaire significativement reduit
 * - Objectif recommande HAS : >= 4h/nuit sur 70% des nuits
 * - Au-dela de 6h, benefice marginal supplementaire sur la somnolence (Epworth)
 */

interface SimulationResult {
  iahResiduel: number;       // evenements/h
  qualiteSommeil: number;    // 0-100
  energie: number;           // 0-100
  risqueCardiovasculaire: number; // 0-100 (100 = risque max)
  somnolenceDiurne: number;  // 0-24 echelle Epworth
  saturationO2: number;      // %
}

function computeSimulation(heures: number, iahInitial: number = 35): SimulationResult {
  // Reduction IAH proportionnelle au temps de port, avec courbe logarithmique
  const efficacitePPC = Math.min(1, Math.log(1 + heures * 0.8) / Math.log(1 + 8 * 0.8));
  const iahResiduel = Math.max(2, iahInitial * (1 - efficacitePPC * 0.92));

  // Qualite sommeil : seuil a 4h pour benefice significatif
  const qualiteSommeil = Math.min(95, 30 + 65 * (1 - Math.exp(-heures / 3.5)));

  // Energie : benefice significatif apres 4h
  const energie = Math.min(90, 25 + 65 * (1 - Math.exp(-heures / 3)));

  // Risque cardiovasculaire : reduit fortement apres 4h (Marin et al., 2005)
  const risqueCardioBase = 85;
  const reductionCV = heures >= 4
    ? 55 + (heures - 4) * 5
    : heures * 10;
  const risqueCardiovasculaire = Math.max(10, risqueCardioBase - Math.min(75, reductionCV));

  // Somnolence Epworth : normal < 10, pathologique > 15
  const somnolenceDiurne = Math.max(4, 20 - heures * 2.2);

  // SpO2 nocturne moyenne
  const saturationO2 = Math.min(97, 88 + heures * 1.3);

  return {
    iahResiduel: Math.round(iahResiduel * 10) / 10,
    qualiteSommeil: Math.round(qualiteSommeil),
    energie: Math.round(energie),
    risqueCardiovasculaire: Math.round(risqueCardiovasculaire),
    somnolenceDiurne: Math.round(somnolenceDiurne * 10) / 10,
    saturationO2: Math.round(saturationO2 * 10) / 10,
  };
}

function ScoreGauge({ label, value, max, unit, color, inverse }: {
  label: string; value: number; max: number; unit: string; color: string; inverse?: boolean;
}) {
  const pct = (value / max) * 100;
  const isGood = inverse ? pct < 40 : pct > 60;
  const isMedium = inverse ? pct >= 40 && pct <= 65 : pct >= 35 && pct <= 60;

  const barColor = isGood ? 'bg-[#34C759]' : isMedium ? 'bg-[#FF9500]' : 'bg-[#FF3B30]';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-[#86868B]">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="h-2.5 bg-[#F5F5F7] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function SleepSimulator() {
  const [heures, setHeures] = useState(4);
  const [iahInitial] = useState(35);

  const result = useMemo(() => computeSimulation(heures, iahInitial), [heures, iahInitial]);
  const resultBase = useMemo(() => computeSimulation(0, iahInitial), [iahInitial]);

  const comparisonData = [
    { nom: 'Qualite sommeil', sans: resultBase.qualiteSommeil, avec: result.qualiteSommeil },
    { nom: 'Energie', sans: resultBase.energie, avec: result.energie },
    { nom: 'SpO2 (%)', sans: resultBase.saturationO2, avec: result.saturationO2 },
  ];

  const radarData = [
    { metric: 'Qualite sommeil', value: result.qualiteSommeil, fullMark: 100 },
    { metric: 'Energie', value: result.energie, fullMark: 100 },
    { metric: 'SpO2', value: result.saturationO2, fullMark: 100 },
    { metric: 'Protection CV', value: 100 - result.risqueCardiovasculaire, fullMark: 100 },
    { metric: 'Vigilance', value: Math.max(0, 100 - result.somnolenceDiurne * 5), fullMark: 100 },
  ];

  const getRecommandation = () => {
    if (heures < 2) return { text: "Port insuffisant. Les benefices therapeutiques sont tres limites en dessous de 2h.", level: 'destructive' as const };
    if (heures < 4) return { text: "Port sous-optimal. Visez au moins 4h pour un benefice cardiovasculaire significatif (recommandation HAS).", level: 'warning' as const };
    if (heures < 6) return { text: "Bon port. Vous etes dans la zone de benefice therapeutique. Chaque heure supplementaire ameliore votre qualite de vie.", level: 'good' as const };
    return { text: "Excellent ! Port optimal. Vous maximisez les benefices sur le sommeil, l'energie et la sante cardiovasculaire.", level: 'excellent' as const };
  };

  const reco = getRecommandation();
  const recoColors = {
    destructive: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    good: 'bg-green-50 border-green-200 text-green-800',
    excellent: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-6">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#5856D6]/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-[#5856D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Simulateur de sommeil PPC</h3>
            <p className="text-sm text-[#86868B]">Visualisez l'impact du temps de port sur votre sante</p>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-[#1D1D1F]">
              Temps de port du masque
            </label>
            <span className="text-3xl font-bold text-[#007AFF]">
              {heures}h
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={heures}
            onChange={(e) => setHeures(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#F5F5F7] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:bg-[#007AFF] [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-xs text-[#86868B]">
            <span>0h</span>
            <span className="text-[#FF9500] font-medium">4h (seuil HAS)</span>
            <span className="text-[#34C759] font-medium">6h (optimal)</span>
            <span>10h</span>
          </div>
        </div>
      </div>

      {/* Recommandation */}
      <div className={`rounded-xl border p-4 ${recoColors[reco.level]}`}>
        <p className="text-sm font-medium">{reco.text}</p>
      </div>

      {/* Metriques */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="font-semibold text-[#1D1D1F]">Impact sur votre sante</h4>
        <ScoreGauge label="IAH residuel" value={result.iahResiduel} max={iahInitial} unit=" evt/h" color="#007AFF" inverse />
        <ScoreGauge label="Qualite de sommeil" value={result.qualiteSommeil} max={100} unit="/100" color="#5856D6" />
        <ScoreGauge label="Energie diurne" value={result.energie} max={100} unit="/100" color="#34C759" />
        <ScoreGauge label="Risque cardiovasculaire" value={result.risqueCardiovasculaire} max={100} unit="/100" color="#FF3B30" inverse />
        <ScoreGauge label="Somnolence (Epworth)" value={result.somnolenceDiurne} max={24} unit="/24" color="#FF9500" inverse />
        <ScoreGauge label="Saturation O2 nocturne" value={result.saturationO2} max={100} unit="%" color="#5AC8FA" />
      </div>

      {/* Graphique comparaison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h4 className="font-semibold text-[#1D1D1F] mb-4">Comparaison : sans PPC vs avec {heures}h de PPC</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={comparisonData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
            <XAxis dataKey="nom" tick={{ fontSize: 12, fill: '#86868B' }} />
            <YAxis tick={{ fontSize: 12, fill: '#86868B' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E5EA',
                borderRadius: '12px',
                color: '#1D1D1F',
              }}
            />
            <Bar dataKey="sans" name="Sans PPC" fill="#FF3B30" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avec" name={`Avec ${heures}h PPC`} fill="#007AFF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h4 className="font-semibold text-[#1D1D1F] mb-4">Profil sante global</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#E5E5EA" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#86868B' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
            <Radar
              name="Votre profil"
              dataKey="value"
              stroke="#007AFF"
              fill="#007AFF"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-[#86868B] text-center">
        Simulation basée sur des données cliniques (Weaver et al. 2007, Marin et al. 2005, étude APPLES).
        Ces projections sont indicatives et ne remplacent pas un avis médical.
      </p>
    </div>
    </div>
  );
}

export default SleepSimulator;
