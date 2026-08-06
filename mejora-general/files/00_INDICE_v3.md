# DecarboNation v2.6 → v3.0 — Plan maestro "Engagement & Polish"

Paquete de instrucciones autosuficientes para **Claude Code**. Cada archivo se puede ejecutar de
forma independiente, pero el orden importa: los archivos 09–12 son *habilitantes* (sin ellos, los
demás no compilan o quedan a medias).

---

## 1. Objetivo del ciclo

Cerrar la brecha entre "simulador que funciona" y "juego serio que engancha y enseña". El feedback
recibido apunta a cinco problemas estructurales, no cosméticos:

| # | Problema reportado | Diagnóstico real | Archivo que lo resuelve |
|---|---|---|---|
| 1 | "El chat molesta / ocupa media pantalla" | El asesor es un panel, no un personaje. Compite con el tablero en lugar de acompañarlo | `13`, `14` |
| 2 | "No sé qué estoy aprendiendo" | No hay bucle de retroalimentación explícito ni debriefing estructurado | `10`, `18` |
| 3 | "Solo hay una forma de ganar / es frustrante" | Condiciones de victoria conjuntivas (AND de 10 umbrales) → una sola estrategia óptima | `17` |
| 4 | "No se entiende de dónde salen los números" | Ecuaciones no testeadas, no trazables, no reproducibles | `16` |
| 5 | "Se ve como un dashboard genérico" | Sin sistema de diseño; Tailwind CDN sin tokens; cero *game feel* | `11`, `19` |

Objetivo transversal declarado por el equipo: **la versión en inglés no debe tener ni una cadena en
español** (archivo `12`).

---

## 2. Orden de ejecución y dependencias

```
09 saneamiento repo ──┬─> 11 design system ──┬─> 19 estética visual
                      │                      │
                      ├─> 12 i18n ───────────┼─> 18 tutoriales
                      │                      │
                      ├─> 16 auditoría ecs. ─┴─> 17 vías de victoria
                      │
                      └─> 13 personaje ──> 14 overlay ──> 15 agente de acciones
                                                             │
                                                             └─> 18 tutoriales
10 (revisión UX) es documento de referencia: se lee primero, no se "ejecuta".
20 (landing) es independiente: puede hacerse en paralelo por otra persona.
```

| # | Archivo | Archivos del repo que toca | Prioridad | Horas est. |
|---|---------|---------------------------|-----------|-----------|
| 09 | `09_saneamiento_repo.md` | estructura, `vite.config.ts`, `index.html` | 🔴 P0 bloqueante | 3 |
| 10 | `10_ux_engagement_review.md` | — (documento de criterios y backlog) | 📘 lectura previa | 0 |
| 11 | `11_design_system.md` | `index.css`, `vite.config.ts`, `components/ui/*` | 🔴 P0 | 10 |
| 12 | `12_i18n_completo.md` | `src/i18n/*`, ~22 componentes, `constants.ts` | 🔴 P0 | 14 |
| 13 | `13_decarbonito_character.md` | `components/decarbonito/DecarboNitoAvatar.tsx` | 🔴 P0 | 10 |
| 14 | `14_decarbonito_overlay.md` | `App.tsx`, layer/provider, `ChatbotPanel.tsx` | 🔴 P0 | 12 |
| 15 | `15_decarbonito_agent_actions.md` | `services/`, `game/uiActionRegistry.ts`, `api/` | 🟠 P1 | 16 |
| 16 | `16_auditoria_ecuaciones.md` | `src/sim/*`, `tests/*`, `scripts/*` | 🔴 P0 | 14 |
| 17 | `17_multiples_vias_victoria.md` | `game/winRoutes.ts`, `constants.ts`, UI | 🟠 P1 | 10 |
| 18 | `18_tutoriales_v3.md` | tutoriales, manuales, debrief | 🟠 P1 | 12 |
| 19 | `19_estetica_visual.md` | `Dashboard.tsx`, `Header.tsx`, tiles, charts | 🟡 P2 | 16 |
| 20 | `20_landing_shareables.md` | `landing/`, `public/`, PWA | 🟡 P2 | 8 |

**Total ≈ 125 h** de desarrollo efectivo (sin contar QA con usuarios ni redacción de contenidos
pedagógicos). Con dedicación parcial, es un ciclo de 8–10 semanas.

### Subconjunto mínimo viable (si el tiempo se acorta)
`09 → 12 → 16 → 17 → 13 → 14`. Esto entrega: repo sano, inglés completo, ecuaciones verificadas,
múltiples vías de victoria y DecarboNito flotante. La estética (`11`, `19`) y el agente de acciones
(`15`) pueden ir a un segundo ciclo sin romper nada.

---

## 3. Instrucción maestra para Claude Code

> Leé el archivo `XX_nombre.md` completo antes de escribir código. Aplicá exactamente los cambios
> descritos, en el orden descrito. Después de cada sección marcada con `### Checkpoint`, ejecutá
> `npm run build` y `npm test` y no continúes si hay errores. Si un bloque "Buscar" no coincide
> literalmente con el código actual, **no adivines**: reportá la discrepancia con el fragmento real
> que encontraste y esperá instrucciones. Nunca borres lógica de simulación existente sin haber
> creado antes el test de regresión correspondiente (ver `16_auditoria_ecuaciones.md`).

### Convenciones del paquete
- **Prosa e interfaz**: español rioplatense (`es-AR`) e inglés (`en`), vía i18n. Nunca hardcodear.
- **Código**: inglés (nombres, comentarios, docstrings, commits).
- **Commits**: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`. Un commit por archivo MD.
- **Branch**: `feat/v3-<slug>` por archivo, merge a `develop`, y `develop → main` solo con build verde.

---

## 4. Prerrequisitos técnicos y riesgos vigentes

### 4.1 Migración obligatoria del modelo de IA
`gemini-2.5-flash` tiene retiro anunciado para **16 de octubre de 2026**, fecha peligrosamente
cercana al cierre del reporte IKI. La familia GA actual es **Gemini 3.x**; el reemplazo directo por
costo/latencia es `gemini-3.6-flash`.

- Migrar en `15_decarbonito_agent_actions.md` (§4).
- Los parámetros de sampling `temperature`, `top_p`, `top_k` están **deprecados** en 3.x: hay que
  quitarlos del `generationConfig` o las llamadas fallarán/ignorarán silenciosamente.
- Nunca volver a hardcodear el nombre del modelo: `VITE_GEMINI_MODEL` en env.

### 4.2 Supabase free tier se auto-pausa a los 7 días de inactividad
Antes de cualquier convocatoria masiva: o se sube a plan pago, o se agrega un cron de Vercel
(`/api/keepalive` cada 3 días) que haga un `select 1`. Sin esto, la primera cohorte de jugadores
encuentra la app rota y se pierde el dato de investigación. Ver `15` §7 (telemetría de acciones).

### 4.3 API key de Gemini expuesta en el cliente
Hoy es aceptable para demos. Con el agente de acciones (archivo `15`) el riesgo sube: se recomienda
mover las llamadas a una Edge Function de Vercel. El código está provisto en `15` §5.

### 4.4 Duplicación de archivos en el repo
Existen `App.tsx` (raíz) y `src/App.tsx` con contenido casi idéntico. **Esto es el riesgo operativo
número uno**: cualquier edición puede aplicarse al archivo que no se compila. Resolverlo primero
(`09_saneamiento_repo.md`).

---

## 5. Criterios de aceptación del ciclo

El ciclo se considera cerrado cuando:

1. `npm run build` sin errores TypeScript y `npm test` con 100% de los tests de invariantes en verde.
2. `npm run i18n:audit` devuelve **cero** cadenas en español fuera de `src/i18n/es.ts`.
3. Un jugador nuevo llega a su **primera decisión con consecuencia visible en menos de 90 segundos**.
4. Cada nivel es ganable por **al menos 3 rutas estratégicamente distintas**, verificadas con el
   harness Monte Carlo (`16` §6): ninguna ruta concentra más del 60% de las victorias simuladas.
5. DecarboNito flota sobre la interfaz, tiene ≥10 estados de animación distintos, y puede señalar y
   operar controles a partir de instrucciones en lenguaje natural, en ambos idiomas.
6. El panel de chat fijo del margen derecho **ya no existe**.
7. Cada partida terminada dispara un debriefing estructurado y guarda el evento en Supabase.
8. Lighthouse ≥ 90 en Performance y ≥ 95 en Accessibility en la ruta principal.

---

## 6. Dependencias nuevas (consolidado)

Todo el paquete agrega estas y ninguna más. Instalar por archivo, no todo de una: si algo se cae,
hay que saber qué lo trajo.

| Paquete | Versión | Archivo que la introduce | Peso gz | Justificación |
|---|---|---|---|---|
| `motion` | ^12 | `13` | ~18 kB | Animación del personaje y viajes; alternativa evaluada y descartada: CSS puro (inviable para el estado `travel`) |
| `@floating-ui/react` | ^0.27 | `14` | ~9 kB | Colocación del globo con colisiones. Evita ~200 líneas de matemática propensa a bugs |
| `zod` | ^4 | `15` | ~14 kB | Validación de argumentos del modelo antes de tocar el estado |
| `zod-to-json-schema` | ^3 | `15` | build-time | Genera los `parametersJsonSchema` de las herramientas |
| `@google/genai` | ^2.15 | `15` | (ya existe) | Actualización desde ^1.0.1; requerida por Gemini 3.x |
| `vitest` + `@vitest/coverage-v8` | ^3 | `16` | dev | Suite de invariantes y golden tests |
| `fast-check` | ^4 | `16` | dev | Invariantes sobre estados generados |
| `tsx` | ^4 | `16` | dev | Harness de simulación sin interfaz |
| `@vercel/og` | ^0.6 | `20` | serverless | Tarjeta de resultado compartible |

Presupuesto: el bundle del cliente crece ~41 kB gz por `motion` + `floating-ui` + `zod`, y **baja**
al sacar Tailwind por CDN y al cargar Recharts con `React.lazy` (archivo `19` §9). El saldo neto
debe ser negativo; si no lo es, revisar antes de cerrar el ciclo.

---

## 7. Qué NO entra en este ciclo

Se mantiene la decisión estratégica previa: fuera de alcance del ciclo IKI actual.

- **Modo Facilitador** (capa de facilitación de sesiones guiadas).
- **v3.0 con datos reales de Argentina** (este paquete es v3.0 *de producto*, no de datos).
- **La Aventura** (novela gráfica interactiva).
- Multijugador sincrónico.

Si aparece presión para incorporarlos, la respuesta es: primero estabilidad y evidencia de
aprendizaje, después expansión.
