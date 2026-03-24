import { useState } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SuiviData {
  day: string;
  heures: number;
  iah: number;
  fuites: number;
  satisfaction: number;
}

interface MonSuiviProps {
  data7j: SuiviData[];
  data30j: SuiviData[];
  data90j: SuiviData[];
}

export function MonSuivi({ data7j, data30j, data90j }: MonSuiviProps) {
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j'>('7j');

  const getData = () => {
    switch (periode) {
      case '7j':
        return data7j;
      case '30j':
        return data30j;
      case '90j':
        return data90j;
    }
  };

  const currentData = getData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[21px] font-semibold text-[#1a2b3c]">Mon Suivi</h3>
            <p className="text-[13px] text-[#64748b]">Évolution de votre traitement</p>
          </div>
        </div>

        {/* Sélecteur période */}
        <div className="flex gap-2 bg-[#f1f5f9] p-1 rounded-xl">
          {(['7j', '30j', '90j'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                periode === p
                  ? 'bg-white text-[#3b82f6] shadow-sm'
                  : 'text-[#64748b] hover:text-[#1a2b3c]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique Temps de traitement */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-[#3b82f6] rounded-full" />
          <h4 className="text-[15px] font-medium text-[#1a2b3c]">Temps moyen de traitement par nuit</h4>
          <div className="ml-auto text-[13px] text-[#64748b]">
            Objectif : <span className="text-[#10b981] font-semibold">≥ 7h</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="heures" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-[#94a3b8] mt-2 italic">
          💡 Un minimum de 4h par nuit est nécessaire pour bénéficier des effets du traitement
        </p>
      </div>

      {/* Graphique IAH résiduel */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-[#10b981] rounded-full" />
          <h4 className="text-[15px] font-medium text-[#1a2b3c]">IAH résiduel (événements par heure)</h4>
          <div className="ml-auto text-[13px] text-[#64748b]">
            Objectif : <span className="text-[#10b981] font-semibold">&lt; 5</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                }}
              />
              <Line type="monotone" dataKey="iah" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-[#94a3b8] mt-2 italic">
          💡 IAH = Index d'Apnée-Hypopnée. Un IAH &lt; 5 indique un excellent contrôle de l'apnée
        </p>
      </div>

      {/* Graphique Fuites */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-[#06b6d4] rounded-full" />
          <h4 className="text-[15px] font-medium text-[#1a2b3c]">Fuites moyennes par nuit (L/min)</h4>
          <div className="ml-auto text-[13px] text-[#64748b]">
            Objectif : <span className="text-[#10b981] font-semibold">&lt; 30 L/min</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                }}
              />
              <Line type="monotone" dataKey="fuites" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-[#94a3b8] mt-2 italic">
          💡 Des fuites importantes peuvent réduire l'efficacité du traitement. Vérifiez l'ajustement de votre masque
        </p>
      </div>

      {/* Graphique Satisfaction */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-[#8b5cf6] rounded-full" />
          <h4 className="text-[15px] font-medium text-[#1a2b3c]">Satisfaction quotidienne (auto-déclarée)</h4>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} domain={[0, 5]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="satisfaction" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-[#94a3b8] mt-2 italic">
          💡 Votre ressenti compte ! N'hésitez pas à signaler tout inconfort
        </p>
      </div>
    </motion.div>
  );
}