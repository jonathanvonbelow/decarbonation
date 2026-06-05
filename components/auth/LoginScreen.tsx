
import React from 'react';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  onDemo: () => void;
}

const GoogleIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="20"
    height="20"
    aria-hidden="true"
  >
    <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 3.2l6-6C34.5 3.2 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-17z" />
    <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7-5.4A23.9 23.9 0 0 0 .5 24c0 3.9.9 7.5 2.6 10.7l7.6-6.1z"/>
    <path fill="#34A853" d="M24 47c5.5 0 10.1-1.8 13.5-4.9l-7.4-5.7c-1.8 1.2-4.2 1.9-6.1 1.9-6.3 0-11.6-4.1-13.3-9.7l-7.6 6.1C7 41.3 14.8 47 24 47z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin, onDemo }) => {
  return (
    <div className="bg-custom-gray min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md flex flex-col items-center gap-8">

        {/* Logo / Título */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-custom-accent mb-2">
            DecarboNation
          </h1>
          <p className="text-lg text-gray-400">
            Simulación de Política Climática
          </p>
        </div>

        {/* Descripción breve */}
        <div className="text-center text-gray-300 text-sm sm:text-base leading-relaxed max-w-sm">
          <p>
            Lidera a tu nación hacia la neutralidad de carbono. Activa políticas
            ambientales, gestiona indicadores socioeconómicos y asesórate con
            DecarboNito, tu consejero de inteligencia artificial.
          </p>
          <p className="mt-2">
            Cada decisión moldea el futuro del planeta. ¿Estás listo para liderar?
          </p>
        </div>

        {/* Botones de autenticación */}
        <div className="w-full flex flex-col gap-4">
          <button
            onClick={onGoogleLogin}
            className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-white text-gray-800 hover:bg-gray-100 font-semibold rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-custom-accent focus:ring-offset-2 focus:ring-offset-custom-gray"
            aria-label="Continuar con Google"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <button
            onClick={onDemo}
            className="flex items-center justify-center w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-custom-gray"
            aria-label="Jugar sin registrarse en modo demo"
          >
            Jugar sin registrarse
          </button>
        </div>

        {/* Nota sobre modo demo */}
        <p className="text-xs text-gray-500 text-center">
          El modo demo no guarda datos de tu sesión
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
