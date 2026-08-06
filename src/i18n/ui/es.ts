// Fuente de verdad estructural: en.ts se tipa contra este objeto (ver ../index.ts), así que
// agregar una clave acá y olvidarla en inglés rompe el build.
export const UI_ES = {
  toast: {
    close: 'Cerrar',
  },
  header: {
    tutorial: 'Ayuda/Tutorial',
    playerManual: 'Manual del Jugador',
    facilitators: 'Facilitadores',
    equations: 'Ecuaciones',
    about: 'Acerca de',
    abandon: 'Abandonar',
    gameOver: 'JUEGO TERMINADO',
    level: 'Nivel',
    year: 'Año',
    yearTooltip: 'El nivel finaliza en el año {target}.',
    score: 'Puntaje',
    currentFocus: 'Enfoque Actual',
    setLevel: 'Fijar Nivel {n}',
    alreadyAtLevel: 'Ya estás en el Nivel {n}',
    setLevelShort: 'Fijar Nvl {n}',
    facilitatorPanel: 'Panel del facilitador',
    toggleLanguageLabel: 'English',
    toggleLanguageFlag: '🇬🇧',
  },
  gameLog: {
    title: 'Registro de Actividades',
    empty: 'Aún no se han registrado actividades.',
    expand: 'Expandir registro',
    collapse: 'Colapsar registro',
  },
  policyToggle: {
    currentEfficiency: 'Eficiencia Actual:',
    efficiencyNote: 'La eficiencia varía con el tiempo y factores políticos.',
    lockedUntil: '🔒 Bloqueada hasta el año {year}.',
    efficiencyTitle: 'Eficiencia: {value}%',
  },
};
