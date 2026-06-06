import React from 'react';
import { HistoricalDataPoint } from '../../types';
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface GameSummaryPanelProps {
  resultado: 'victoria' | 'derrota' | 'abandono';
  nivelAlcanzado: number;
  historicalData: HistoricalDataPoint[];
  onPlayAgain: () => void;
}

const RESULTADO_CONFIG = {
  victoria: {
    label: 'Victoria',
    color: 'text-green-400',
    bg: 'bg-green-900',
    border: 'border-green-700',
    emoji: 'Felicitaciones!',
  },
  derrota: {
    label: 'Derrota',
    color: 'text-red-400',
    bg: 'bg-red-900',
    border: 'border-red-700',
    emoji: 'Sigue intentando.',
  },
  abandono: {
    label: 'Partida abandonada',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900',
    border: 'border-yellow-700',
    emoji: 'Hasta la proxima.',
  },
};

const GameSummaryPanel: React.FC<GameSummaryPanelProps> = ({
  resultado,
  nivelAlcanzado,
  historicalData,
  onPlayAgain,
}) => {
  const config = RESULTADO_CONFIG[resultado];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`p-5 rounded-t-xl ${config.bg} border-b ${config.border}`}>
          <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
          <p className="text-gray-300 text-sm mt-1">{config.emoji}</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-gray-300 text-sm">
              Nivel alcanzado: <span className="font-bold text-white">{nivelAlcanzado}</span>
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {historicalData.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Puntaje general a lo largo del tiempo
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="year" stroke="#A0AEC0" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#A0AEC0" tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="generalScore"
                      name="Puntaje General"
                      stroke="#63B3ED"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Indicadores clave
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="year" stroke="#A0AEC0" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#A0AEC0"
                      domain={[0, 100]}
                      tickFormatter={(tick: number) => `${tick}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="biodiversity"
                      name="Biodiversidad"
                      stroke="#48BB78"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="foodSecurity"
                      name="Seg. Alimentaria"
                      stroke="#F6E05E"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="socialWellbeing"
                      name="Bienestar Social"
                      stroke="#ED64A6"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {historicalData.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No hay datos historicos para mostrar.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onPlayAgain}
            className="w-full px-4 py-3 bg-custom-accent hover:opacity-90 text-white font-bold rounded-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-custom-accent text-sm"
          >
            Jugar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSummaryPanel;
