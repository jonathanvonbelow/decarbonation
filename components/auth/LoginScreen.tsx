import React from 'react';
import type { Language } from '../../hooks/useLanguage';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  onDemo: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const COPY = {
  es: {
    subtitle: 'Simulador de política pública para la descarbonización',
    googleBtn: 'Iniciar sesión con Google',
    or: 'o',
    demoBtn: 'Continuar en modo demo',
    demoNote: 'El modo demo no guarda tu progreso ni datos de sesión.',
    langLabel: 'English',
  },
  en: {
    subtitle: 'Public policy simulator for decarbonization',
    googleBtn: 'Sign in with Google',
    or: 'or',
    demoBtn: 'Continue in demo mode',
    demoNote: 'Demo mode does not save your progress or session data.',
    langLabel: 'Español',
  },
} as const;

const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  onDemo,
  language,
  onToggleLanguage,
}) => {
  const t = COPY[language];

  return (
    <div className="bg-custom-gray min-h-screen flex items-center justify-center p-4">
      <div className="bg-custom-light-gray rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative">

        {/* Selector de idioma — esquina superior derecha */}
        <button
          onClick={onToggleLanguage}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <span className="text-base leading-none">{language === 'es' ? '🇬🇧' : '🇦🇷'}</span>
          {t.langLabel}
        </button>

        <h1 className="text-4xl font-bold text-custom-accent mb-2 mt-4">DecarboNation</h1>
        <p className="text-gray-400 text-sm mb-8">{t.subtitle}</p>

        <div className="space-y-4">
          <button
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.googleBtn}
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-600" />
            <span className="flex-shrink mx-3 text-gray-500 text-xs">{t.or}</span>
            <div className="flex-grow border-t border-gray-600" />
          </div>

          <button
            onClick={onDemo}
            className="w-full px-6 py-3 bg-gray-700 text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {t.demoBtn}
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-6">{t.demoNote}</p>
      </div>
    </div>
  );
};

export default LoginScreen;
