# 20 — Landing, difusión y embudo de adopción

**Depende de:** nada del código del juego (puede hacerse en paralelo)
**Toca:** `landing/` (nuevo), `public/`, `index.html`, `api/og.tsx`, analítica

---

## 1. El problema de distribución

Hoy la URL abre directamente el juego, en español, sin contexto. Quien llega desde un correo
institucional se encuentra con un tablero de doce indicadores y ninguna explicación de qué es esto,
para quién, cuánto dura, ni qué gana por jugarlo. El kit de convocatoria ya resuelve esa pregunta
en el correo; **la web la vuelve a abrir**.

Consecuencia medible: no hay forma de saber cuántos de los contactos institucionales llegaron,
cuántos empezaron a jugar y cuántos terminaron un nivel. Sin eso, el reporte IKI no puede afirmar
nada sobre alcance.

---

## 2. Arquitectura

```
decarbonation.vercel.app/            → landing (estática, ~40 kB, sin React)
decarbonation.vercel.app/play        → el juego (SPA actual)
decarbonation.vercel.app/play?demo=1 → partida guiada de 5 años, sin registro
decarbonation.vercel.app/docentes    → paquete para docentes (es) / /teachers (en)
decarbonation.vercel.app/r/:id       → resultado compartible (OG dinámico)
```

La landing es **HTML + CSS estáticos**, no una ruta de la SPA. Razones: carga instantánea, indexable,
y no arrastra el bundle del juego para alguien que todavía no decidió jugar. Usar los mismos tokens
del archivo `11` importando `tokens.css` — la landing y el juego deben verse como la misma cosa.

---

## 3. Estructura de la landing

| Sección | Contenido | Regla |
|---|---|---|
| **Héroe** | Titular en una línea + subtítulo de dos + botón "Jugar ahora (sin registro)" + DecarboNito saludando | El botón debe verse sin hacer scroll, en móvil también |
| **Demostración** | Video/GIF de 20 s en bucle: activar política → simular → indicadores cambian → informe del año | Sin audio, `autoplay muted playsinline`, ≤ 2 MB, con póster |
| **Qué es** | Tres frases. Qué se hace, cuánto dura (15–40 min), qué se lleva | Nada de "innovadora plataforma": decir qué pasa cuando hacés clic |
| **Para quién** | Cuatro tarjetas = los cuatro bloques de actores del kit de convocatoria, cada una con **qué gana ese actor** y su propio botón | Reusar el texto del kit; no reescribirlo |
| **Qué se aprende** | Los tres objetivos de aprendizaje, en lenguaje de resultados ("vas a poder explicar por qué...") | Máximo 3 |
| **Rigor** | Modelo, ecuaciones documentadas, auditoría, institución, financiamiento IKI, equipo | Este bloque es el que convence a una institución |
| **Docentes** | Enlace al paquete: guía de facilitación, plan de clase, consignas de debriefing | |
| **Preguntas** | 6 preguntas: ¿es gratis? ¿necesito registrarme? ¿funciona en celular? ¿en inglés? ¿qué datos guardan? ¿puedo usarlo en mi curso? | La de datos es obligatoria: hay telemetría |
| **Pie** | Instituciones, contacto, licencia, política de privacidad, repositorio | |

Textos en `es` y `en` con el mismo mecanismo del archivo `12`, o dos archivos HTML si resulta más
simple para una página estática. Detección por `navigator.language` con conmutador visible.

---

## 4. Modo demostración

`/play?demo=1` arranca una partida acotada:

- **5 años**, no 15. Termina en ~8 minutos.
- Tres políticas disponibles, no diez.
- Apertura en frío del archivo `18` §3, siempre activa.
- Al terminar: informe reducido + "esto fue una muestra; la partida completa tiene tres niveles,
  finanzas y pactos" + botón para empezar la partida completa.

Sirve para tres cosas a la vez: enlace de correo institucional, botón de la landing, y proyección
en vivo al abrir un taller (el facilitador la juega en 8 minutos frente a la sala).

---

## 5. Resultado compartible

Al terminar un nivel, además del debriefing, se genera una tarjeta:

```
┌───────────────────────────────────────────┐
│  DECARBONATION            Nivel 2 · 2038  │
│                                           │
│  Vía de la Transición Productiva          │
│  Puntaje 612                              │
│                                           │
│  Biodiversidad 58   CO₂/cáp 4,1           │
│  Predicciones acertadas 71%               │
│                                           │
│  decarbonation.vercel.app        [robot]  │
└───────────────────────────────────────────┘
```

Implementación: `@vercel/og` en `api/og.tsx` genera el PNG desde parámetros firmados. El botón
"Compartir" usa `navigator.share()` en móvil y copia el enlace en escritorio.

```tsx
// api/og.tsx
import { ImageResponse } from '@vercel/og';
export const config = { runtime: 'edge' };

/**
 * Renders the shareable result card. Params are HMAC-signed on the client's result id so
 * arbitrary values can't be minted into a card that looks official.
 */
export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = clampInt(searchParams.get('level'), 1, 3);
  const route = ROUTE_LABELS[searchParams.get('route') ?? 'equilibrium'];
  // ... verificar firma, componer JSX, devolver ImageResponse 1200×630
}
```

Meta etiquetas correspondientes en `/r/:id` para que la vista previa se despliegue en WhatsApp,
LinkedIn y X. **Este es el único mecanismo de crecimiento orgánico del proyecto**: un jugador que
comparte su resultado es una convocatoria que no hubo que enviar por correo.

---

## 6. Metadatos y PWA

```html
<!-- index.html y landing -->
<meta property="og:title" content="DecarboNation — Simulador de política climática AFOLU">
<meta property="og:description" content="Dirigí la política climática de un país. 15 minutos. Sin registro.">
<meta property="og:image" content="https://decarbonation.vercel.app/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0B1512">
```

PWA mínima: `manifest.webmanifest` con íconos 192/512, `display: standalone`, y un service worker
que cachee el *shell* (no el estado de la partida). Justificación real, no moda: en talleres con
conectividad intermitente en Misiones, que el juego cargue con la red caída es la diferencia entre
la actividad y una hora perdida. La simulación es local; solo el asesor necesita red.

---

## 7. Analítica y embudo

Eventos mínimos (mismo esquema de Supabase que el resto de la telemetría; sin herramientas de
terceros que compliquen el consentimiento):

| Evento | Propiedades |
|---|---|
| `landing_view` | `utm_source`, `utm_campaign`, `locale`, `referrer` |
| `play_click` | `origin: hero \| audience_card \| demo` |
| `game_start` | `mode: demo \| full`, `locale` |
| `first_decision` | `seconds_since_start` — la métrica del archivo `18` |
| `year_simulated` | `year`, `level` |
| `level_completed` | `level`, `route`, `score` |
| `debrief_completed` | `questions_answered` |
| `share_clicked` | `surface` |

Embudo a reportar (esta tabla es la que va al informe IKI):

```
landing_view → play_click → game_start → first_decision → year 5 → level_completed → debrief
```

Etiquetar cada bloque del kit de convocatoria con su `utm_campaign` para saber **qué tipo de actor
efectivamente juega**, no solo quién recibió el correo. Es la diferencia entre reportar envíos y
reportar alcance.

### Privacidad

Aviso claro en la landing y en el primer arranque: qué se guarda (decisiones de juego, predicciones,
respuestas del debriefing si se completan), qué **no** (identidad, correo, transcripciones de chat
sin consentimiento), y cómo pedir la eliminación. Sin esto, el dato no es publicable.

---

## 8. Paquete para docentes

Página `/docentes` con descargas directas, sin formulario:

- Guía de facilitación (PDF, 4 páginas): agenda de 90 min, roles, momentos de pausa, preguntas.
- Plan de clase alineado a objetivos de aprendizaje.
- Consignas de debriefing imprimibles (las cinco preguntas del archivo `18` §7).
- Diapositivas de encuadre (10 láminas) para proyectar antes de jugar.
- Hoja de ecuaciones para estudiantes avanzados.
- Preguntas frecuentes de aula: qué hacer si un grupo termina antes, si no hay internet, si alguien
  quiere "romper" el juego (spoiler: dejarlo, y después preguntarle qué aprendió rompiéndolo).

Todo en español e inglés. Estos archivos ya existen en el material del proyecto: acá se trata de
publicarlos en un lugar donde un docente los encuentre sin escribirle a nadie.

---

## 9. Búsqueda

Términos que deben resolver a la landing: *juego serio política climática*, *simulador AFOLU*,
*serious game climate policy*, *juego descarbonización aula*, *simulación NDC educación*.

Acciones: `<title>` y `<h1>` distintos y descriptivos, texto real (no solo imágenes), datos
estructurados `SoftwareApplication` + `LearningResource` en JSON-LD, `sitemap.xml`, y una entrada de
blog o página de proyecto en el sitio institucional de la FCF–UNaM que enlace a la landing (los
enlaces desde dominios `.edu.ar` son lo que más mueve el posicionamiento en este nicho).

---

## Verificación

1. La landing carga en < 1,5 s en 4G simulada y pesa < 200 kB en total.
2. Lighthouse ≥ 95 en Performance, Accessibility, Best Practices y SEO en `/`.
3. La vista previa de enlace se ve correcta en WhatsApp, LinkedIn y X (probar con las tres).
4. `/play?demo=1` termina en ≤ 10 minutos y ofrece la partida completa al cerrar.
5. Una tarjeta de resultado generada con parámetros manipulados no valida la firma y no se renderiza.
6. El embudo completo se puede consultar con una sola consulta SQL y devuelve datos coherentes tras
   una sesión de prueba de punta a punta.
7. La app carga y es jugable con la red desconectada (excepto el asesor, que avisa claramente).
8. Los ocho materiales para docentes están descargables en ambos idiomas, sin formulario intermedio.
