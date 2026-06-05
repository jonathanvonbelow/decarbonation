# DecarboNation v2.6 — Índice maestro de orquestación

> Documento de referencia para Jonathan y para los agentes de Claude Code que
> implementan v2.6. Este archivo describe qué hace cada unidad, en qué orden
> deben ejecutarse y cómo encajan en el proyecto.

---

## 1. Resumen de v2.6

v2.6 agrega cuatro capas sobre el núcleo de juego de v2.5:

| Capa | Qué aporta |
|------|-----------|
| **Autenticación OAuth** | Login con Google via Supabase Auth |
| **Persistencia en Supabase** | Partidas, encuestas y snapshots guardados en la nube |
| **Encuestas integradas** | `SurveyPre` (antes de jugar) y `SurveyPost` (al finalizar) |
| **Snapshots históricos** | Foto del estado del juego cada turno, útil para analytics |
| **Modo Facilitador** | Panel con métricas de todas las sesiones activas |

El juego sigue siendo completamente jugable sin auth (modo demo), pero los datos
no se persisten.

---

## 2. Estructura de dos olas

### Ola 1 — Unidades paralelas (U1–U8)

Cada unidad crea **archivos nuevos y disjuntos** que no modifican `App.tsx`.
Pueden mergearse a `main` en cualquier orden sin conflictos.

| Unidad | Qué crea |
|--------|---------|
| U1 | Schema SQL para Supabase |
| U2 | `supabaseService.ts` — cliente y funciones de datos |
| U3 | `LoginScreen.tsx` — pantalla de login con Google |
| U4 | `SurveyPre.tsx` — encuesta pre-partida |
| U5 | `SurveyPost.tsx` — encuesta post-partida |
| U6 | `FacilitatorPanel.tsx` — panel del facilitador |
| U7 | Queries SQL de analytics |
| U8 | Documentación (este archivo y sus compañeros) |

### Ola 2 — Integración secuencial (U9)

Una vez mergeadas todas las ramas de Ola 1:

- **U9** cablea todo en `App.tsx`: importa los componentes nuevos, añade los
  estados de sesión, conecta los hooks de encuesta y snapshot, y agrega el gate
  de auth al inicio del render.

---

## 3. Mapa de dependencias

```
U1 (schema SQL) ──────────────────────────┐
U2 (supabaseService.ts) ──────────────────┤
U3 (LoginScreen.tsx) ─────────────────────┤
U4 (SurveyPre.tsx) ───────────────────────┤─→ U9 (integración App.tsx)
U5 (SurveyPost.tsx) ──────────────────────┤
U6 (FacilitatorPanel.tsx) ────────────────┤
U7 (analytics SQL) ───────────────────────┤
U8 (docs) ────────────────────────────────┘
```

U9 depende de que U1–U8 estén mergeadas. Dentro de U9, el orden recomendado es:
1. Importar `supabaseService` (U2) — base de todas las llamadas
2. Añadir estados de sesión (`user`, `sessionId`, `showLogin`, `showSurveyPre`,
   `showSurveyPost`, `showGameSummary`)
3. Cablear `LoginScreen` (U3) como gate en la línea 1671 del render actual
4. Cablear `SurveyPre` (U4) después del login y antes del primer turno
5. Cablear `SurveyPost` (U5) en el `useEffect` de `gameOverReason` (línea 575)
6. Integrar `FacilitatorPanel` (U6) via el callback `onToggleFacilitatorPanel`
7. Añadir el bloque `define` de Supabase en `vite.config.ts` (ver `08_deploy_vercel_v26.md`)
8. Corregir `CLAUDE.md` y eliminar `src/App.tsx` (ver `09_ajustes_jugabilidad.md`)

---

## 4. Índice de archivos de documentación

| Archivo | Ruta | Qué documenta |
|---------|------|---------------|
| Índice v2.5 | `00_indice.md` | Mejoras 01–07 de la versión anterior |
| Chatbot layout | `01_chatbot_layout.md` | Redimensionar ChatbotPanel, colapsar GameLogPanel |
| Decarbonito brevedad | `02_decarbonito_brevedad.md` | Ajustar prompt del chatbot |
| PieChart decimales | `03_piechart_decimales.md` | Fix de decimales en Dashboard |
| CO₂ inicial | `04_co2_inicial_realista.md` | Valor inicial más realista de emisiones |
| Presión agrícola | `05_presion_agricola.md` | Ajuste de mecánica de presión del sector |
| Nivel 1 economía | `06_nivel1_economia.md` | Reequilibrio de la economía en Nivel 1 |
| Deploy v2.5 | `07_deploy_vercel.md` | Guía de deploy de la versión anterior |
| **Orquestación v2.6** | `docs/v2.6/00_orquestacion.md` | Este archivo |
| **Deploy v2.6** | `docs/v2.6/08_deploy_vercel_v26.md` | Variables de entorno, RLS, checklist |
| **Jugabilidad v2.6** | `docs/v2.6/09_ajustes_jugabilidad.md` | Correcciones y mejoras adicionales |

---

## 5. Orden de setup sugerido para Jonathan

Estos son los pasos manuales que requieren acción fuera de Claude Code:

```
a. Ejecutar el schema SQL de U1 en Supabase Studio
   → Crea las 5 tablas nuevas con RLS activo

b. Configurar Google OAuth en Supabase
   → Authentication > Providers > Google
   → Necesitás Client ID y Client Secret de Google Cloud Console
   → Ver docs/v2.6/08_deploy_vercel_v26.md para los redirect URIs

c. Añadir las variables de entorno en Vercel
   → Settings > Environment Variables
   → SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY
   → Ver docs/v2.6/08_deploy_vercel_v26.md para el detalle completo

d. Mergear las ramas de Ola 1 (U1–U8) a main
   → Pueden mergearse en cualquier orden (no hay conflictos entre ellas)
   → Verificar que cada PR pasa el build de Vercel antes de mergear

e. Lanzar U9 (integración en App.tsx)
   → Una sola rama que cablea todo
   → Requiere que U1–U8 estén ya en main
   → Después de merge: verificar en incógnito con login real de Google
```

---

## 6. Relación con la Guía de Publicación

El archivo `guia_publicacion_app_web.docx` (en la raíz del repo) describe el
proceso general de publicación de apps web. La correspondencia con las unidades
de v2.6 es:

| Fase de la guía | Unidad/s de v2.6 que la cubren |
|-----------------|-------------------------------|
| Diseño de base de datos | U1 (schema SQL) |
| Capa de servicios / API | U2 (supabaseService.ts) |
| Autenticación de usuarios | U3 (LoginScreen.tsx) + config OAuth en U8 |
| Flujo de onboarding | U4 (SurveyPre.tsx) |
| Cierre de sesión / resultados | U5 (SurveyPost.tsx) |
| Panel de administración | U6 (FacilitatorPanel.tsx) |
| Analytics y métricas | U7 (queries SQL) |
| Deploy e infraestructura | U8 (docs/v2.6/08_deploy_vercel_v26.md) |

---

## 7. Notas sobre el código base actual

Algunos detalles del código actual que U9 debe tener en cuenta:

- **Entrypoint real:** `index.tsx` importa `App` desde `./App` (la raíz).
  El archivo `src/App.tsx` es un duplicado obsoleto — ver `09_ajustes_jugabilidad.md`.
- **Env vars:** El proyecto usa `process.env.X` vía el bloque `define` de
  `vite.config.ts`, NO `import.meta.env`. Ver `09_ajustes_jugabilidad.md` para
  la corrección en `CLAUDE.md`.
- **Hook natural para post-survey:** `useEffect` en línea 575 de `App.tsx`
  reacciona a `gameState.gameOverReason` — ahí debe lanzarse `SurveyPost`.
- **Hook natural para snapshots:** `updateHistoricalData` (líneas 786–809) se
  llama cada turno — ahí debe llamarse también `supabaseService.saveSnapshot`.
- **Gate de auth en el render:** La línea 1671 de `App.tsx` inicia el `return`
  del componente. El gate de auth debe ir como primer conditional antes del
  `<div className="bg-custom-gray ...">`.
