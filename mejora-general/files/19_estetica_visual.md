# 19 — Estética aplicada y *game feel*

**Depende de:** `11_design_system.md` (tokens y primitivas), `16_auditoria_ecuaciones.md` (`SimTrace`), `17_multiples_vias_victoria.md`
**Toca:** `Header.tsx`, `Dashboard.tsx`, `PolicyPanel.tsx`, `InstrumentPanel.tsx`, gráficos, informe anual (nuevo)

El archivo `11` define el sistema; este lo **aplica** pantalla por pantalla y agrega la capa de
respuesta sensorial que hoy no existe. Un simulador sin *game feel* se percibe como una planilla
con colores: el jugador toma decisiones sin sentir que pasó nada.

---

## 1. Diagnóstico visual actual

| Síntoma | Causa | Se corrige en |
|---|---|---|
| "Parece un dashboard genérico" | Todo tiene el mismo peso: 12 paneles grises equidistantes, sin jerarquía | §2 |
| El jugador no nota que un indicador cambió | Los números se reemplazan sin transición | §3 |
| Simular un año no se siente como un evento | Cero pausa dramática, cero síntesis: los números saltan y ya | §4 |
| Los gráficos no se leen | Colores por defecto de Recharts, sin umbrales, sin anotaciones | §5 |
| Los tres niveles se ven idénticos | No hay progresión visual que acompañe la progresión de complejidad | §6 |
| No hay recompensa por nada | Cero reconocimiento de logros intermedios | §7 |

---

## 2. Jerarquía del tablero

Grilla de 12 columnas, con tres franjas de peso decreciente. Regla: **lo que el jugador mira para
decidir va arriba; lo que consulta va abajo; lo que revisa a veces se colapsa.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER  año · nivel · puntaje · ruta líder · idioma · ayuda          │  56px, sticky
├──────────────────────────────────────────────────────────────────────┤
│ CINTA DE CARBONO — banda horizontal de ancho completo, 96 px         │  ← elemento distintivo
│   balance acumulado + emisiones/cápita + hito de neutralidad         │
├──────────────────────────────────┬───────────────────────────────────┤
│ INDICADORES (8 col)              │ RUTAS DE VICTORIA (4 col)         │
│  tiles de 4 columnas c/u         │  tarjetas del archivo 17          │
├──────────────────────────────────┼───────────────────────────────────┤
│ POLÍTICAS (8 col)                │ TERRITORIO (4 col)                │
│  lista con eficiencia y costo    │  torta de usos + delta anual      │
├──────────────────────────────────┴───────────────────────────────────┤
│ INSTRUMENTOS (12 col, nivel ≥2, colapsable, abierto por defecto)      │
├──────────────────────────────────────────────────────────────────────┤
│ HISTORIA (12 col, colapsable, cerrado por defecto)                    │
└──────────────────────────────────────────────────────────────────────┘
        [ SIMULAR AÑO ]  ← barra de acción fija abajo, ancho completo en móvil
```

Decisiones:

- **La Cinta de Carbono ocupa el lugar de honor.** Es el indicador que da nombre al juego; hoy es
  un número más entre doce. Convertirla en una banda horizontal con el acumulado histórico y la
  distancia a la neutralidad le da al jugador una narrativa visual continua.
- El botón de simular pasa a **barra de acción fija** al pie: es la acción más importante y hoy
  está perdida entre paneles. Muestra además el año destino y un resumen de "3 cambios sin simular".
- Máximo **dos niveles de anidamiento** de paneles. Los paneles dentro de paneles son la razón
  principal de que la pantalla se lea como ruido.
- Densidad: interlínea 1,45; separación entre paneles 16 px; dentro de un panel, 12 px.

---

## 3. Cambio visible: los deltas

Toda cifra que cambia entre años se anima. Sin esto, la simulación es invisible.

```tsx
// src/components/ui/AnimatedValue.tsx
/**
 * Counts from the previous value to the next one and flashes the direction.
 * Duration is fixed (not proportional to the delta) so several tiles stay in sync.
 */
export const AnimatedValue: React.FC<{
  value: number; decimals?: number; goodDirection?: 'up' | 'down';
}> = ({ value, decimals = 1, goodDirection = 'up' }) => {
  const prev = usePrevious(value);
  const display = useCountUp(prev ?? value, value, 900);   // ease-out cubic, rAF
  const delta = prev === undefined ? 0 : value - prev;
  const good = goodDirection === 'up' ? delta > 0 : delta < 0;
  // ...
};
```

Especificación:

- **Contador**: 900 ms, `ease-out`, con fuente monoespaciada tabular (`font-variant-numeric:
  tabular-nums`) para que no se muevan los dígitos.
- **Píldora de delta** al lado del número: `▲ +2,4` / `▼ −1,1`, en `chlorophyll` si la dirección es
  buena y `ember` si no. Entra con `translateY(-4px) → 0`, permanece 4 s, se desvanece.
- **Cruce de umbral**: si el indicador pasa de precaución a crítico (o al revés), el tile hace un
  pulso de borde de 600 ms y — solo en el caso crítico — DecarboNito emite el aviso del archivo `14`.
- **Escalonamiento**: los tiles animan con 60 ms de retraso entre sí, de izquierda a derecha. Cuesta
  una línea de CSS y convierte doce animaciones simultáneas en una lectura secuencial.
- `prefers-reduced-motion` → sin conteo ni pulso; el delta aparece igual, estático.

---

## 4. El año como evento: el Informe Anual

Al presionar simular, hoy: los números cambian. Propuesta, seis segundos de coreografía:

| t | Qué pasa |
|---|---|
| 0,0 s | El botón se bloquea, DecarboNito pasa a `load`, la Cinta de Carbono se atenúa |
| 0,3 s | Barrido horizontal sobre el tablero (línea de 2 px en `chlorophyll`, 500 ms), como un escáner |
| 0,8 s | El año del header incrementa con un giro de dígito |
| 1,0 s | Los tiles animan sus deltas, escalonados (§3) |
| 1,9 s | La torta de usos del suelo transiciona con interpolación de arcos (no salto) |
| 2,4 s | Si hubo evento aleatorio: tarjeta de noticia entra desde arriba, 4 s, descartable |
| 3,0 s | Panel de rutas actualiza barras; si una condición se cumplió, destello |
| 3,5 s | **Ficha del año**: tarjeta compacta con los 3 términos principales del `SimTrace` |
| — | Si la predicción estaba activada: resultado de la predicción (archivo `18` §5) |

La **ficha del año** es la pieza clave y sale gratis del archivo `16`:

```
─────────────────────────────────────────
 2031 · Lo que más pesó
 −4,2  Biodiversidad · expansión de cultivos convencionales
 +3,1  Balance de C  · conservación + neutralidad (sinergia)
 −1,8  Tesoro        · costo de 4 políticas activas
─────────────────────────────────────────
```

Tres líneas. Es la respuesta a "no sé qué estoy aprendiendo", entregada cada año en vez de solo al
final. Se puede desactivar en ajustes (facilitadores con poco tiempo) y se acumula en el log.

**Botón de saltar**: cualquier clic durante la coreografía la completa al instante. No se le hace
perder seis segundos a alguien que simula veinte años seguidos.

---

## 5. Gráficos

Aplicar el tema de Recharts del archivo `11` §5 y además:

| Gráfico | Cambios |
|---|---|
| Historia de indicadores | Líneas de referencia de umbral (`ReferenceLine`) por indicador con etiqueta; bandas verticales sombreadas para los años con evento aleatorio; punto marcado en el año actual |
| Usos del suelo (torta) | Transición animada de arcos; etiquetas con % **y** kHa; delta anual por porción al pasar el cursor; paleta semántica del archivo `11` (verdes para bosque, ocres para cultivo) |
| Cinta de Carbono | Área acumulada con línea de neutralidad en 0; el área positiva en `chlorophyll` a 20%, la negativa en `ember` a 20% |
| Presiones (nivel ≥2) | Radar de tres ejes con la zona de riesgo (>70) sombreada, en vez de tres barras sueltas |
| Comparación de rutas | Barras horizontales apiladas por condición, con el objetivo como marca |

Reglas transversales: sin líneas de grilla verticales; ejes con máximo 5 marcas; tooltips con la
tipografía monoespaciada y valores alineados a la derecha; ninguna serie depende **solo** del color
(usar además grosor o guionado) por daltonismo.

---

## 6. Progresión visual por nivel

La complejidad crece; la ambientación debe acompañarla para que el jugador *sienta* que subió de
escala. Sutil, nunca decorativo:

| Nivel | Fondo | Acento | Encabezado |
|---|---|---|---|
| 1 — Estrategia Nacional | Curvas de nivel densas (territorio) | `chlorophyll` | "Escala nacional" |
| 2 — Coordinación Regional | Curvas + retícula regional tenue | `chlorophyll` + `ochre` (presiones) | "Escala regional" |
| 3 — Liderazgo Global | Retícula de proyección global | `chlorophyll` + `hydro` (finanzas y pactos) | "Escala global" |

Transición entre niveles: fundido de 1,2 s del fondo mientras se muestra el informe de nivel.
El cambio de textura de fondo es lo único que cambia; los tokens de color no se tocan.

---

## 7. Reconocimiento y progresión

Sistema de insignias mínimo pero real. Nada de puntos vacíos: cada insignia nombra un **concepto**
del dominio, de modo que la lista de logros funcione como resumen de lo que el juego enseña.

| Insignia | Condición |
|---|---|
| Primer Balance | Primer año con balance de carbono positivo |
| Sumidero Neto | Tres años consecutivos con balance positivo |
| Sin Atajos | Ganar un nivel sin activar ninguna política de bajo costo ambiental |
| Negociadora | Bajar las tres presiones por debajo de 50 en el mismo año |
| Pluralista | Ganar el mismo nivel por las tres rutas (en partidas distintas) |
| Pronosticadora | 80% de aciertos de predicción en un nivel |
| Sin Deuda | Terminar el nivel 3 con deuda/PBI < 30% |
| Transición Justa | Ganar con bienestar social y biodiversidad ambos ≥ 60 |
| Aprendiz | Completar el debriefing de una partida |

Presentación: fila discreta en el header (solo la última obtenida) + grilla completa en el perfil.
Al obtenerla: `celebrate` de DecarboNito + tarjeta de 3 s. Ni sonido ni confeti por defecto.

**Sonido**: opcional y desactivado por defecto. Si se implementa, cuatro efectos como máximo
(activar política, cruce de umbral, fin de año, logro), sintetizados con la Web Audio API — no hay
presupuesto para una biblioteca de audio ni justificación para 2 MB de assets.

---

## 8. Estados vacíos, carga y error

Hoy inexistentes o genéricos. Cada uno es una oportunidad de personalidad y de instrucción:

| Estado | Tratamiento |
|---|---|
| Sin políticas activas | Ilustración tenue del territorio + "Tu nación está en piloto automático. Activá tu primera política." |
| Panel de instrumentos sin política activa | Explica qué son los instrumentos y por qué no hay ninguno todavía |
| Historia con un solo año | Muestra el gráfico con un punto y "simulá algunos años para ver la tendencia" |
| Cargando respuesta del bot | `think` + tres puntos en el globo. **Nunca** un spinner genérico |
| Sin API key | Tarjeta explicando que el asesor está desconectado, con el juego 100% funcional |
| Error de simulación | Nunca pantalla en blanco: `ErrorBoundary` con estado, semilla y botón de reporte |

---

## 9. Presupuesto de rendimiento

| Métrica | Objetivo |
|---|---|
| JS inicial (gzip) | < 250 kB — Recharts se carga con `React.lazy` solo cuando hay un gráfico visible |
| LCP | < 2,0 s en 4G simulada |
| Animación | 60 fps: solo `transform` y `opacity`; cero animación de `width`, `top` o `box-shadow` |
| Re-renders al simular | El tablero completo, una vez. `React.memo` en tiles y filas de política |
| Lighthouse | Performance ≥ 90, Accessibility ≥ 95 |

Tailwind por CDN (si sigue en `index.html`) **debe** salir: pasa a build. Es el ítem individual que
más pesa hoy y además impide purgar clases no usadas.

---

## Verificación

1. Capturas antes/después de las tres pantallas principales, versionadas en `docs/ui/`.
2. Simular un año: la coreografía completa dura ≤ 6 s y se puede saltar con un clic.
3. La ficha del año muestra los tres términos correctos según `SimTrace` (contrastar con un test).
4. Con `prefers-reduced-motion` activo no hay conteo, barrido ni pulso, y la información sigue completa.
5. Contraste ≥ 4,5:1 en todo texto sobre fondo, verificado con la auditoría de Lighthouse.
6. Ninguna serie de gráfico se distingue solo por color (verificar con un simulador de deuteranopía).
7. Lighthouse cumple el presupuesto de §9 en la ruta principal.
8. Las nueve insignias se pueden obtener; cada una tiene su test de condición en `tests/sim/badges.spec.ts`.
