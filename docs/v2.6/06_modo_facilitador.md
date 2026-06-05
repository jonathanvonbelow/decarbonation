# U6 — Panel Modo Facilitador

## 1. Propósito pedagógico

El Panel Modo Facilitador es una herramienta exclusiva para facilitadores de sesiones educativas con DecarboNation. Su objetivo central es permitir que el/la facilitador/a ajuste los parámetros del motor de simulación *en tiempo real*, sin necesidad de modificar el código fuente ni reiniciar la sesión.

Alineado con los objetivos del proyecto IKI, este panel permite:

- **Explorar escenarios específicos**: ajustar la sensibilidad de indicadores para demostrar cómo distintas condiciones iniciales (p. ej., alta presión agrícola, baja tasa de crecimiento del PBI) modifican el espacio de decisiones disponible.
- **Calibrar la dificultad pedagógica**: aumentar o reducir la resiliencia del sistema para grupos más o menos avanzados, sin alterar la estructura del juego.
- **Reproducir casos reales**: configurar parámetros que reflejen la situación de un país o región específica (emisiones de referencia, tasas de interés, etc.) para contextualizar la simulación.
- **Facilitar la reflexión colectiva**: congelar el estado con un preset exportado y compartirlo entre co-facilitadores para garantizar que todos los grupos trabajen con las mismas condiciones.

---

## 2. Refactor en App.tsx que debe realizar U9

Para que `FacilitatorPanel` quede plenamente cableado, **U9 debe realizar los siguientes cambios en `App.tsx`** (no tocar hasta que U9 esté activa):

### 2.1 Elevar `CONTROL_PARAMS` a estado React

```tsx
// Antes (uso directo del módulo)
import { CONTROL_PARAMS } from './constants';
// ... en algún lugar se usa CONTROL_PARAMS directamente

// Despues — agregar cerca de los otros useState (~línea 434)
import { CONTROL_PARAMS } from './constants';
import { ControlParams } from './types';

const [controlParams, setControlParams] = useState<ControlParams>(CONTROL_PARAMS);
```

### 2.2 Pasar `controlParams` a la simulación

Reemplazar **todas** las referencias al objeto importado `CONTROL_PARAMS` dentro de las funciones de simulación por el argumento/ref dinámico:

```tsx
// Opción A — pasarlo como argumento a runSimulationRound
function runSimulationRound(state: GameState, params: ControlParams): GameState { ... }

// Opción B — guardarlo en gameStateRef (si se usa ref para evitar stale closures)
gameStateRef.current.controlParams = controlParams;
```

### 2.3 Agregar `showFacilitatorPanel` a los estados de modales

```tsx
// Cerca de los otros booleans de modales (~línea 434 de App.tsx)
const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(false);
```

### 2.4 Agregar botón de acceso en el Header

En el componente `Header` (o donde corresponda según la estructura de App.tsx), agregar un botón con icono de engranaje:

```tsx
<button
  onClick={() => setShowFacilitatorPanel(true)}
  title="Panel Modo Facilitador"
  className="text-gray-400 hover:text-custom-accent transition-colors"
  aria-label="Abrir panel de facilitador"
>
  {/* icono de engranaje inline SVG o emoji ⚙ */}
  ⚙
</button>
```

### 2.5 Render condicional del panel

Al final del JSX de App.tsx (antes del cierre del `return`), agregar:

```tsx
{showFacilitatorPanel && (
  <FacilitatorPanel
    controlParams={controlParams}
    onChange={setControlParams}
    onClose={() => setShowFacilitatorPanel(false)}
  />
)}
```

Y el import correspondiente:

```tsx
import FacilitatorPanel from './components/facilitator/FacilitatorPanel';
```

---

## 3. Código de acceso por defecto y cómo cambiarlo

El código de acceso está **hardcodeado** en la constante `ACCESS_CODE` al inicio de `FacilitatorPanel.tsx`:

```tsx
// components/facilitator/FacilitatorPanel.tsx — línea ~11
const ACCESS_CODE = 'facilitador2026';
```

Para cambiarlo basta con modificar ese string y hacer un nuevo build. No existe actualmente un mecanismo de configuración en runtime (se podría agregar en v3.0 como variable de entorno o prop).

**Codigo por defecto:** `facilitador2026`

---

## 4. Exportar e importar presets

### Exportar

El botón "Exportar preset JSON" genera un archivo `.json` con el objeto `ControlParams` completo en su estado actual. El nombre del archivo incluye la fecha (`decarbonation_preset_YYYY-MM-DD.json`).

Uso típico:
1. El facilitador configura los parámetros para el escenario deseado.
2. Hace clic en "Exportar preset JSON".
3. Guarda el archivo y lo comparte con co-facilitadores (correo, drive, etc.).

### Importar

El botón "Importar preset" abre un selector de archivos `.json`. Al importar:

- Si el archivo contiene **exactamente** las mismas claves que `CONTROL_PARAMS`, se aplica tal cual.
- Si faltan claves: se usan los valores por defecto para las claves faltantes y se muestra una advertencia en amarillo indicando cuántas claves estaban ausentes.
- Si hay claves desconocidas (extras): se ignoran y se informa en la advertencia.
- Si el archivo no es JSON válido: se muestra un mensaje de error.

Esto garantiza compatibilidad hacia adelante: un preset creado con una versión anterior del juego puede importarse en una versión más nueva sin romper la sesión.

---

## 5. Estado diferible a v3.0

Si el tiempo de implementación no alcanza para completar el cableado completo (paso 2 de este documento), el Panel puede entregarse como componente aislado en el estado actual: funciona visualmente y acepta props, pero sin efecto real sobre la simulación hasta que U9 eleve el estado en `App.tsx`.

Según el documento IKI de planificación del proyecto, esta funcionalidad está clasificada como **mejora de facilitación de alto valor** pero no es bloqueante para el lanzamiento de la versión 2.6. El componente puede quedar detrás del gate de acceso sin estar wired, y el juego seguirá funcionando con los `CONTROL_PARAMS` estáticos del módulo `constants.ts`.

La integración completa (estado elevado + botón en Header) se puede diferir a **v3.0**, especialmente si se planea en paralelo agregar persistencia de presets en localStorage o en backend.
