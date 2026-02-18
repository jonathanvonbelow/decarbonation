# Mejora 01 — ChatbotPanel más grande + GameLogPanel colapsable

## Contexto
El panel de DecarboNito es demasiado pequeño (`h-[60vh] max-h-[650px]`) y comparte columna con el
GameLogPanel. Múltiples usuarios reportaron que el chat era ilegible. La solución es:
- Darle al ChatbotPanel mucha más altura (usar `flex-1` para que ocupe el espacio disponible).
- Hacer el GameLogPanel colapsable, comenzando **colapsado por defecto**.

---

## Archivo 1: `components/ChatbotPanel.tsx`

### Cambio requerido
Reemplazar en el `return` la clase de altura fija del div contenedor:

**Buscar:**
```tsx
<div className={`bg-custom-light-gray rounded-lg shadow-xl flex flex-col 
                h-[60vh] 
                max-h-[650px]`}>
```

**Reemplazar con:**
```tsx
<div className="bg-custom-light-gray rounded-lg shadow-xl flex flex-col flex-1 min-h-[400px]">
```

> `flex-1` hace que el panel ocupe todo el espacio vertical disponible en su contenedor padre.
> `min-h-[400px]` garantiza una altura mínima razonable en pantallas pequeñas.

---

## Archivo 2: `components/GameLogPanel.tsx`

Reemplazar el archivo completo con la versión colapsable:

```tsx
import React, { useState } from 'react';

interface GameLogPanelProps {
  logs: string[];
}

const GameLogPanel: React.FC<GameLogPanelProps> = ({ logs }) => {
  // Starts collapsed by default — feedback indicated this panel is secondary
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-custom-light-gray rounded-lg shadow-xl flex flex-col">
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-custom-accent focus:ring-opacity-50"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Colapsar registro de actividades' : 'Expandir registro de actividades'}
      >
        <h3 className="text-lg font-semibold text-custom-accent flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 10a2 2 0 00-2 2v.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V16a2 2 0 00-2-2H4z" clipRule="evenodd" />
          </svg>
          Registro de Actividades
          {!isExpanded && logs.length > 0 && (
            <span className="ml-2 text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
              {logs.length}
            </span>
          )}
        </h3>
        {/* Chevron icon indicating collapse state */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-2 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="text-xs text-gray-400 border-b border-gray-700/50 pb-1 animate-fadeIn">
                {log}
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic text-center pt-2">Aún no se han registrado actividades.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameLogPanel;
```

---

## Archivo 3: `App.tsx`

El div contenedor de la columna derecha necesita `flex-col` y altura completa para que `flex-1` del
ChatbotPanel funcione correctamente.

**Buscar:**
```tsx
<div className="flex flex-col gap-6">
  <ChatbotPanel
```

**Reemplazar con:**
```tsx
<div className="flex flex-col gap-6 h-full">
  <ChatbotPanel
```

> Asegurarse de que el parent `lg:col-span-1` también tenga altura definida. Si el layout no se ve
> correcto, agregar `self-stretch` al div de la columna derecha en el grid.

---

## Verificación
Después de aplicar los cambios:
1. `npm run dev`
2. Verificar que el chat ocupa casi toda la altura de la pantalla en la columna derecha.
3. Verificar que el "Registro de Actividades" aparece colapsado con badge de contador.
4. Click en el header del registro → debe expandirse mostrando los logs.
5. `npm run build` — sin errores TypeScript.
