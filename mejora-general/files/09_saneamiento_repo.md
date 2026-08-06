# 09 — Saneamiento del repositorio (P0 bloqueante)

## Contexto

El proyecto nació en Google AI Studio y arrastra tres decisiones de andamiaje que hoy bloquean
cualquier mejora seria de UI, animación o testing:

1. **Duplicación de código fuente.** Existen `App.tsx` en la raíz y `src/App.tsx`. Ambos contienen
   `runSimulationRound`, `generateLevel3WinReason`, etc. Solo uno se compila. Editar el otro produce
   el síntoma más frustrante posible: "hice el cambio y no pasó nada".
2. **Tailwind por CDN** (`<script src="https://cdn.tailwindcss.com">`) con la config inline en
   `index.html`. El JIT del CDN no soporta plugins, no purga, no permite `@theme`, y agrega ~400 kB
   de JS bloqueante. Imposible construir un design system encima.
3. **Importmap a esm.sh** para React, Recharts y `@google/genai`, conviviendo con `package.json`.
   Riesgo de doble instancia de React (hooks rotos, `Invalid hook call`) y de versiones divergentes
   entre dev y prod. Además impide agregar dependencias nuevas (Motion) sin editar el importmap.

Nada de lo que sigue en el paquete v3 es seguro hasta resolver estos tres puntos.

---

## Paso 1 — Determinar cuál `App.tsx` está vivo

```bash
# Desde la raíz del proyecto
cat index.tsx | head -20        # ¿qué importa el entry point?
cat vite.config.ts              # ¿hay alias o root distinto?
ls -la App.tsx src/App.tsx      # comparar tamaño y fecha
diff App.tsx src/App.tsx | head -60
```

**Regla de decisión:** el archivo vivo es el que resuelve la cadena de import desde `index.tsx`.
Si `index.tsx` hace `import App from './App'` y está en la raíz, el vivo es `./App.tsx`.

### Acción
Consolidar **todo el código fuente bajo `src/`**. Estructura destino:

```
src/
  main.tsx                  # antes index.tsx
  App.tsx                   # único
  index.css                 # tokens + Tailwind (ver 11_design_system.md)
  constants.ts
  types.ts
  components/
    ui/                     # primitivas del design system
    decarbonito/            # avatar, overlay, burbuja
    dashboard/
    policy/
    levelSpecific/
    manuals/
    common/
  sim/                      # motor extraído (ver 16_auditoria_ecuaciones.md)
  game/                     # reglas: winRoutes, uiActionRegistry
  i18n/                     # es.ts, en.ts, provider
  services/                 # gemini, supabase
tests/
scripts/
api/                        # Vercel edge functions
```

```bash
# Mover (ajustar según lo que exista realmente)
git mv App.tsx src/App.tsx.new    # si el vivo era el de raíz
git rm src/App.tsx                # eliminar el fantasma
git mv src/App.tsx.new src/App.tsx
git mv index.tsx src/main.tsx
git mv constants.ts types.ts src/
git mv components src/components
```

Actualizar `index.html`:

```html
<script type="module" src="/src/main.tsx"></script>
```

> ⚠️ Verificar todos los imports relativos tras el movimiento. `npx tsc --noEmit` los lista todos.

### Checkpoint
`npm run build` compila y `npm run dev` levanta la app con el comportamiento actual intacto.
Commit: `refactor(repo): consolidate sources under src/, remove duplicated App.tsx`

---

## Paso 2 — Eliminar el importmap y fijar dependencias reales

### 2.1 Quitar de `index.html`

**Buscar y eliminar por completo:**

```html
<script type="importmap">
{
  "imports": {
    "react-dom/": "https://esm.sh/react-dom@^19.1.0/",
    "react/": "https://esm.sh/react@^19.1.0/",
    "react": "https://esm.sh/react@^19.1.0",
    "recharts": "https://esm.sh/recharts@^2.15.3",
    "@google/genai": "https://esm.sh/@google/genai@^1.0.1"
  }
}
</script>
```

### 2.2 Instalar las dependencias localmente

```bash
npm install react react-dom recharts @google/genai
npm install motion                      # animaciones del avatar (import: "motion/react")
npm install -D typescript vite @vitejs/plugin-react
npm install -D vitest @vitest/coverage-v8   # tests de ecuaciones (archivo 16)
```

> **Nota de versiones (verificar al ejecutar):** `@google/genai` va por 2.x; a partir de 3.0.0 exige
> Node ≥ 22 y cambia el comportamiento de Automatic Function Calling (pasa a invocarse desde el
> módulo `Chats`, no desde `models.generateContent`). Si se pinea, pinear `<3.0.0` conscientemente.
> `motion` es la continuación de `framer-motion`; el import correcto es `motion/react`.
> Correr `npm view <pkg> version` antes de fijar cualquier rango.

### 2.3 Verificar instancia única de React

```bash
npm ls react react-dom     # debe haber exactamente una versión de cada
```

Si aparecen duplicados, agregar en `vite.config.ts`:

```ts
resolve: {
  dedupe: ['react', 'react-dom'],
},
```

### Checkpoint
La app corre sin red hacia esm.sh (probar con DevTools → Network, filtro `esm.sh`: cero requests).
Commit: `refactor(build): drop esm.sh importmap, use local npm dependencies`

---

## Paso 3 — Migrar Tailwind del CDN a Vite

### 3.1 Instalar

```bash
npm install tailwindcss @tailwindcss/vite
```

Tailwind v4 usa configuración *CSS-first*: ya no hace falta `tailwind.config.js`; los tokens se
declaran con `@theme` dentro del CSS. El detalle completo de tokens está en `11_design_system.md`;
acá solo se hace la migración mecánica preservando los colores actuales.

### 3.2 `vite.config.ts`

```ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: { '@': path.resolve(__dirname, './src') },
    },
    define: {
      // Keep backwards compatibility with existing process.env.API_KEY reads
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: { sourcemap: true },
  };
});
```

### 3.3 `src/index.css` (versión de migración, se reemplaza en el archivo 11)

```css
@import "tailwindcss";

@theme {
  --color-custom-gray: #1a202c;
  --color-custom-light-gray: #2d3748;
  --color-custom-accent: #4299e1;
  --color-custom-green: #38a169;
  --color-custom-red: #e53e3e;
  --color-level-1-bg: #1a332a;
  --color-level-2-bg: #3d2211;
  --color-level-3-bg: #3b1818;
}

@keyframes fadeInScaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInUp    { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }

@utility animate-fade-in-scale-up { animation: fadeInScaleUp 0.5s ease-out forwards; }
@utility animate-fade-in          { animation: fadeIn 0.3s ease-out forwards; }
@utility animate-slide-in-up      { animation: slideInUp 0.4s ease-out forwards; }
```

En `src/main.tsx`, primera línea de imports:

```ts
import './index.css';
```

### 3.4 Limpiar `index.html`

Eliminar el `<script src="https://cdn.tailwindcss.com">` y **todo** el bloque
`<script>tailwind.config = {...}</script>`, además del `<link rel="stylesheet" href="/index.css">`
si apuntaba al CSS viejo de la raíz.

### Checkpoint
Comparar visualmente la app antes/después: los colores `bg-custom-light-gray`, `text-custom-accent`,
etc. deben verse idénticos. Las animaciones `animate-fade-in` deben seguir funcionando.
Commit: `refactor(styles): migrate Tailwind from CDN to Vite plugin (v4, CSS-first)`

---

## Paso 4 — Higiene de proyecto

### 4.1 `.gitignore` (verificar que exista con nombre correcto, no `_gitignore`)

```
node_modules/
dist/
.env
.env.local
.vercel
coverage/
*.local
```

### 4.2 `package.json` — scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "sim:harness": "node scripts/sim-harness.mjs",
    "i18n:audit": "node scripts/i18n-audit.mjs",
    "typecheck": "tsc --noEmit"
  }
}
```

> `build` ahora corre `tsc --noEmit` primero: los errores de tipos dejan de llegar a producción.

### 4.3 Variables de entorno

Renombrar `_env.local` → `.env.local` y dejar:

```
GEMINI_API_KEY=AIza...
VITE_GEMINI_MODEL=gemini-3.6-flash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Replicar las mismas variables en Vercel → Settings → Environment Variables.

### 4.4 Encoding

Varios archivos (`constants.ts`) tienen caracteres acentuados con codificación mixta. Normalizar:

```bash
file -i src/constants.ts     # debe decir charset=utf-8
# Si no lo está:
iconv -f ISO-8859-1 -t UTF-8 src/constants.ts -o src/constants.utf8.ts && mv src/constants.utf8.ts src/constants.ts
```

Agregar `.editorconfig`:

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

---

## Verificación final del archivo 09

- [ ] Existe un único `App.tsx`, dentro de `src/`.
- [ ] `npm ls react` muestra una sola versión.
- [ ] DevTools → Network no muestra ningún request a `esm.sh` ni a `cdn.tailwindcss.com`.
- [ ] `npm run build` pasa `tsc --noEmit` sin errores.
- [ ] La app en `npm run preview` se ve y se comporta igual que antes del refactor.
- [ ] `git status` limpio; `.env.local` no trackeado.

> Este archivo no cambia ninguna funcionalidad visible. Ese es exactamente el criterio de éxito: si
> algo se ve distinto, algo se rompió.
