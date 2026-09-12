# 21 — Fusión con EcoSIM: "DecarboNation Territorio" (vista previa)

**Depende de:** `16` (motor puro en `src/sim/`), `17` (vías de victoria), `11`/`19` (tokens v3)
**Toca:** `src/sim/` (módulos nuevos, sin cambiar el comportamiento anual), `src/territorio/` (nuevo),
`public/assets/ecosim/` (nuevo), `territorio.html` (nuevo entry), `index.html` (sección nueva),
`vite.config.ts`, `vercel.json`
**Fuente:** `combinacion/EcoSIM` (prototipo con arte e interfaz mejorados) y las dos revisiones PDF
de la misma carpeta. EcoSIM no se compila ni se importa: se porta lo que sirve.

---

## 1. Decisiones del equipo (2026-09-11)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Alcance del nivel único | Base en la parametrización del **Nivel 2**, con desbloqueo progresivo de mecánicas en una sola partida de 30 años. **Paso de tiempo mensual**, como en EcoSIM, para que dentro de cada año entren más situaciones y noticias. |
| 2 | Juego de 3 niveles | **Sigue siendo el principal** (`/play`, paquete docente y landing sin cambios). La fusión vive en una **sección aparte**, presentada como "lo próximo que viene en el desarrollo del juego". |
| 3 | Intervención directa en el mapa | Sí, pero **solo agregar áreas protegidas u otros usos públicos**. Todo lo demás (deforestación, transición agroecológica, etc.) surge de la dinámica del modelo. Cada intervención tiene que entrar en todas las ecuaciones que usan ese dato. |
| 4 | Commits | Un commit por fase en la rama `v4-fusion`. |

## 2. Qué se toma de cada lado

- **DecarboNation aporta el modelo**: `src/sim/` es la única fuente de verdad de indicadores. Es
  lo que piden las dos revisiones de `combinacion/`: núcleo causal verificable, reproducible y
  testeable, con la IA fuera del cálculo.
- **EcoSIM aporta la cara**: mapa isométrico en canvas (`IsoMap.tsx`), 16 tiles ilustrados,
  retratos de actores, arte de portada, HUD flotante (barra superior, franja de indicadores,
  riel de acciones, panel lateral, tarjeta de evento), mapas de calor, reloj con pausa/×1/×4.
- **No se trae**: TanStack Start, Nitro, better-auth, PGlite, zustand, multijugador p2p, scripts
  de Grok, el asesor por xAI (lo reemplaza DecarboNito), el "Dossier", ni los pilares de agua y
  energía de EcoSIM (el modelo no los calcula; no se inventan).

## 3. Paso mensual

Todas las ecuaciones de estado del modelo son de primer orden: `x(t+1) = x(t) + f(x(t))`
(biodiversidad, seguridades, conflicto social, colapso político, presiones, áreas, finanzas).
El paso mensual es la discretización de Euler con Δt = 1/12:

```
x(m+1) = x(m) + f(x(m)) / 12
```

Propiedades que lo hacen defendible y que se testean:

1. **Mismos equilibrios**: `f(x*) = 0` en anual ⇔ en mensual. Una estrategia sostenida converge
   al mismo lugar en ambos juegos; cambia la trayectoria (más suave), no el destino.
2. **12 pasos mensuales ≈ 1 paso anual** para estados típicos (tolerancia chica, test).
3. **Conservación de área**: la matriz de transición conserva el total; aplicar 1/12 del cambio
   también.
4. **Límites**: una combinación convexa de valores en [0,100] queda en [0,100].

Cómo se trata cada parte del año:

| Parte del modelo | Tratamiento mensual |
|---|---|
| Stocks (indicadores, presiones, áreas, conflicto, colapso) | `x + Δanual/12`, en el mismo orden que `stepYear` |
| Crecimiento de población y PBI | tasa anual / 12 por mes |
| Costos de políticas y pactos, impuestos, intereses, amortización | flujo anual / 12 por mes |
| Préstamo | se acredita una vez, completo, el mes en que se pide |
| Contador de años activos de cada política | `+1/12` por mes; la eficiencia se recalcula con la misma curva exponencial |
| CO₂ per cápita y puntaje | funciones del estado (no stocks): se recalculan cada mes |
| Eventos aleatorios | probabilidad mensual `1 − (1 − p)^(1/12)` por evento, varios por año posibles |
| Fin de partida (colapso, hambruna, bancarrota) | mismas condiciones, evaluadas cada mes |
| Evaluación de victoria | al cumplirse los 30 años (360 meses) |

Implementación: `src/sim/monthly.ts` (`stepMonth`), reutilizando los submódulos puros. `stepYear`
no cambia de comportamiento; lo único que se extrae es la evaluación de fin de partida a una
función exportada que usan ambos.

## 4. Territorio: mapa ↔ usos del suelo

Grilla de 12×12. **120 parcelas productivas de 5 kHa** (600 kHa, el total del Nivel 2) y 24 de
contexto fijo (río, humedales, pueblo) que no entran al balance.

| Uso del suelo (motor) | Tile |
|---|---|
| BNNP, bosque nativo no protegido | `forest` |
| BNP, bosque nativo protegido | `forest` + marco de reserva dibujado en canvas |
| CA, cultivos agroecológicos | `regen` (variante `orchard`) |
| CC, cultivos convencionales | `intensive` |
| PF, plantaciones forestales | `reforest` |
| PRG, praderas y pasturas | `pasture` |

`src/sim/territory.ts` (puro, determinista):

- **Motor → mapa**: después de cada mes, las áreas se cuantizan a cantidad de parcelas (mayor
  resto) y se cambian solo las parcelas necesarias. Una parcela que cambia se elige en la frontera
  del uso que crece (vecinas del mismo tipo primero), así la deforestación se ve avanzar desde los
  cultivos y las reservas crecen desde sus bordes. Las parcelas declaradas por el jugador no se
  mueven.
- **Jugador → motor**: la única intervención directa es declarar usos públicos (§5). Cada
  declaración mueve 5 kHa entre usos del modelo *antes* del próximo mes, y desde ahí la dinámica
  hace el resto.

## 5. Usos públicos que el jugador puede declarar

Regla: solo entra un uso público si el modelo tiene cómo representarlo en **todas** sus
ecuaciones.

| Acción | Efecto en el modelo | Ecuaciones que lo reciben |
|---|---|---|
| **Declarar área protegida** sobre una parcela de bosque nativo | 5 kHa BNNP → BNP | carbono (tasas de BNP), biodiversidad (peso BNP 0,50 vs 0,20), seguridad alimentaria (−0,20 vs −0,10), seguridad económica (costo de oportunidad −0,05), deforestación (BNP no se convierte a cultivos), vía de conservación (% bosque nativo) |

Costo: se paga de las Reservas del Tesoro, con un parámetro nuevo en `CONTROL_PARAMS`
(`Costo_Declaracion_Area_Protegida_por_kHa`) para que el facilitador lo ajuste.

**Pendiente de definir con el equipo**: qué otros usos públicos (p. ej. restauración de bosque
nativo en tierra pública, humedal protegido, parque energético) y con qué parámetros. Cada uno
necesita tasas de emisión/secuestro y pesos en biodiversidad, seguridad alimentaria, seguridad
económica y conflicto social antes de habilitarse; no se inventan.

## 6. Nivel único y desbloqueo progresivo

- El motor corre con `currentLevel = 2` fijo (fórmulas, pesos y rutas del Nivel 2), estado inicial
  del Nivel 2, 2024 → 2054.
- **Años 1–5**: políticas on/off y áreas protegidas. El esfuerzo se reparte en partes iguales
  entre los instrumentos de cada política activa (con `currentLevel = 2`, una política sin
  esfuerzo asignado no hace nada).
- **Desde el año 6**: el jugador reparte el esfuerzo entre instrumentos.
- **Pactos**: se habilitan según su `unlockYear` (2030, 2035, 2038), como ya hace el modelo.
- **Desde el año 11**: préstamo y presión fiscal adicional. Los términos fiscales que en el juego
  de 3 niveles solo existen en el Nivel 3 (seguridad económica, conflicto social) se activan acá
  con un parámetro explícito; en el juego de 3 niveles su valor por defecto sigue siendo
  `currentLevel === 3`.

## 7. Situaciones y noticias

- **Noticias**: titulares generados desde el estado del modelo (deforestación del mes, presiones
  altas, reservas negativas, cruces de umbral). Sin efecto mecánico.
- **Eventos**: los `ALL_RANDOM_EVENTS` del modelo, con tirada mensual, en la tarjeta con retrato de
  EcoSIM (retrato según la categoría del evento).
- **Situaciones con decisión** (estilo EcoSIM: sequía, protesta de productores, lobby industrial…):
  solo si sus opciones se expresan en variables del modelo (`RandomEventEffect`). Fase posterior.

## 8. Actores

Los retratos de agricultor, ONG y ciudadanía acompañan a `PP_AGRICOLA`, `PP_AMBIENTALISTA` y
`PP_SOCIAL`; el de industria, a seguridad económica.

## 9. Publicación

- Entry nuevo `territorio.html` → `src/territorio/main.tsx`, ruta limpia `/territorio`.
- En la landing, una sección "Próximamente / En desarrollo" con una captura y el link, marcada
  como vista previa. El juego principal, `/play` y el paquete docente no cambian.
- La vista previa corre en modo demo (sin encuestas ni persistencia en Supabase) hasta que
  gradúe.

## 10. Fases

| Fase | Contenido |
|---|---|
| F0 | `CLAUDE.md`, esta especificación, rama |
| F1 | Motor mensual `stepMonth` + tests (equilibrios, 12 meses ≈ 1 año, invariantes) |
| F2 | `territory.ts` (mapa ↔ áreas, área protegida) + tests |
| F3 | Assets de EcoSIM + `IsoMap` portado + entry `territorio.html` con el mapa andando |
| F4 | Estado de la partida (reloj, políticas, desbloqueos, fin de partida) y HUD |
| F5 | Eventos y noticias mensuales, actores |
| F6 | DecarboNito en la vista previa |
| F7 | Calibración de rutas con el harness en modo mensual |
| F8 | Sección en la landing, i18n, QA en navegador |
