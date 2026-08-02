import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoricalDataPoint } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';
const T = {
  es: { victoria: '¡Victoria!', derrota: 'Partida terminada', abandono: 'Partida abandonada', levelReached: 'Nivel alcanzado:', trajectory: 'Trayectoria del puntaje general', playAgain: 'Iniciar nueva simulación' },
  en: { victoria: 'Victory!', derrota: 'Game Over', abandono: 'Game Abandoned', levelReached: 'Level reached:', trajectory: 'General score trajectory', playAgain: 'Start a new simulation' },
} as const;

interface GameSummaryPanelProps {
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
  historicalData: HistoricalDataPoint[];
  onPlayAgain: () => void;
}

const GameSummaryPanel: React.FC<GameSummaryPanelProps> = ({
  resultado,
  nivelAlcanzado,
  historicalData,
  onPlayAgain,
}) => {
  const { language } = useLanguageContext();
  const t = T[language];
  const headerColor = resultado === 'victoria' ? 'text-green-400' : resultado === 'derrota' ? 'text-red-400' : 'text-yellow-400';
  const headerText = t[resultado];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-summary-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl w-full text-gray-100 max-h-[90vh] flex flex-col">
        <h2 id="game-summary-title" className={`text-3xl font-bold mb-1 ${headerColor}`}>
          {headerText}
        </h2>
        <p className="text-gray-400 mb-4">{t.levelReached} {nivelAlcanzado}</p>

        {historicalData.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">{t.trajectory}</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={historicalData}>
                <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis domain={[0, 1000]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', color: '#f3f4f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="generalScore"
                  stroke="#60a5fa"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <button
          onClick={onPlayAgain}
          className="mt-auto px-6 py-3 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
        >
          {t.playAgain}
        </button>
      </div>
    </div>
  );
};

export default GameSummaryPanel;
