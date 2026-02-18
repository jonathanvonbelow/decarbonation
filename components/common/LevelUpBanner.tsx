
import React from 'react';

interface LevelUpBannerProps {
  result: {
    level: number;
    status: 'won' | 'lost';
    reason: string;
  };
  onClose: () => void;
}

const LevelUpBanner: React.FC<LevelUpBannerProps> = ({ result, onClose }) => {
  const isWin = result.status === 'won';
  const title = isWin ? `¡Nivel ${result.level} Superado!` : `Nivel ${result.level} No Superado`;
  const bgColor = isWin ? 'bg-green-700 border-green-500' : 'bg-red-800 border-red-600';
  const buttonText = isWin ? 'Continuar al Siguiente Desafío' : 'Volver a Intentar';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] transition-opacity duration-300 ease-in-out animate-fade-in" onClick={onClose}>
      <div 
        className={`${bgColor} p-8 rounded-xl shadow-2xl text-center text-white max-w-lg w-11/12 mx-auto relative border-2`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-3 text-white hover:text-gray-300 text-3xl font-bold leading-none focus:outline-none"
          aria-label="Cerrar"
        >
          &times;
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h2>
        <p className="text-base sm:text-lg mb-6 max-h-40 overflow-y-auto p-1">{result.reason}</p>
        <button 
          onClick={onClose} 
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default LevelUpBanner;