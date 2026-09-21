# 23 — Territorio 100 × 100: el arte del encargo 22, sobre el modelo

**Fase:** v4 / F8 · **Estado:** implementada
**Antecedente:** `21_fusion_ecosim.md` (la vista previa mensual) y `22_arte_territorio_expansion.md`
(el encargo de arte, entregado por Grok en `combinacion/DsAIKnEjEGDSsAPx-grok-workspace`).

## 1. Qué cambia

La vista previa pasa de un mapa de 12 × 12 parcelas —regular, cuadrado, con un solo dibujo por uso
del suelo— a **un territorio irregular de 100 × 100** con cuatro regiones, mar, río, relieve,
caminos y ciudades, dibujado con el set completo del encargo 22 (cuatro variantes por elemento,
trama urbana por densidad, decoradores de estado, animaciones).

| | Antes | Ahora |
|---|---|---|
| Grilla | 12 × 12 = 144 | **100 × 100 = 10.000** |
| Parcelas productivas | 120 | **6.000** (exactas, por construcción) |
| kHa por parcela | 5 | **0,1 kHa = 1 km² = 100 ha** |
| Superficie del modelo | 600 kHa | **600 kHa (sin cambio)** |
| Tiles distintos | 14 | 58 elementos × 4 variantes + caminos + 10 FX |

## 2. La decisión de escala (por qué el modelo no se recalibra)

El encargo 22 proponía multiplicar la superficie por cinco y advertía que eso obliga a recalibrar
"el reparto por región, el costo de los usos públicos y las rutas de victoria". **Se hizo al revés:
el territorio no crece en hectáreas, crece en resolución.** Las 600 kHa del nivel 2 siguen siendo
las mismas; lo que cambia es que ahora se reparten entre 6.000 parcelas en vez de 120.

Consecuencias:

- Ninguna ecuación, tasa, costo por kHa ni ruta de victoria cambia. El juego de 3 niveles no se
  toca, y la vista previa conserva su calibración (`npm run sim:territorio` da los mismos
  resultados que en F7).
- Una parcela es **1 km²**, una unidad que se lee sola en pantalla y en las noticias.
- Declarar un uso público ya no mueve una parcela sino **un lote de 5 kHa = 50 parcelas**: la misma
  superficie, el mismo precio y el mismo peso en el modelo que tenía una declaración antes. El lote
  se arma alrededor de la parcela elegida, por cercanía, sobre parcelas elegibles y conexas.
- `createTerritory` divide el área del modelo por las parcelas productivas, y el generador recorta
  el borde del territorio a pastizal o roca hasta que el número de parcelas productivas es
  **exactamente** 6.000. Así nunca sobra ni falta superficie (un remanente sería "tierra gratis"
  declarable).

## 3. Geografía (`src/sim/geography.ts`, nuevo)

Determinista a partir de la semilla; sin React ni `Math.random`. Genera, en este orden:

1. **Silueta irregular**: ruido fractal sobre una superelipse; se conserva la componente conexa
   mayor y se rellenan los huecos. Afuera queda `void` (fuera del territorio) o `sea` (mar), según
   una línea de costa ondulada que muerde el sureste.
2. **Cuatro regiones** (las de `INITIAL_REGIONAL_ZONES_DATA`): Norte Agrícola, Centro Metropolitano,
   Sur Boscoso y Costa Pesquera, separadas por un límite deformado con ruido (nunca una línea recta)
   y con pesos suaves en la frontera.
3. **Agua**: un río que nace en el sur boscoso, atraviesa el centro y desemboca en la costa, con
   meandros y un afluente desde la llanura norte; lago en el sur, lagunas en el norte; humedales
   naturales en las riberas y el delta.
4. **Relieve y costa**: afloramientos rocosos en el sur; playas y médanos donde la tierra toca el
   mar.
5. **Asentamientos**: metrópolis con núcleo denso, distrito industrial aguas abajo y periurbano;
   pueblo agrícola con silos en el norte; villa turística junto al lago en el sur; puerto pesquero
   en la desembocadura; caseríos dispersos.
6. **Caminos**: Dijkstra entre los cuatro centros (el río se cruza con puentes), con material por
   región (tierra, asfalto, camino costero) y ramales a los caseríos.

## 4. La ciudad crece con el modelo (`developTerritory`)

Las parcelas urbanas son *slots* con un nivel base y un rango. Cada mes, sin tocar superficie
productiva:

- **Vivienda**: sube de densidad (caserío → pueblo → barrio → torres) con el PBI real respecto del
  inicial. Crece sobre lotes reservados del periurbano, nunca sobre parcelas del modelo.
- **Asentamientos informales**: aparecen en el borde cuando el bienestar social se desploma.
- **Industria**: se ve pesada y humeante mientras las emisiones per cápita siguen altas, y más
  limpia a medida que bajan.

Todo con histéresis: un valor que oscila en el umbral no hace parpadear los edificios.

## 5. Decoradores de estado (`src/territorio/fx.ts`)

Lo que *pasa* sobre una parcela sale de lo que el juego ya tiene: las situaciones abiertas en la
bandeja (incendio, sequía, inundación, plaga, tala ilegal, corte de ruta, marcha), el evento del mes
(sequía severa, cosecha récord), el estado del modelo (humo sobre la industria pesada mientras las
emisiones no bajan, fauna que vuelve a las reservas cuando sube la biodiversidad, suelo degradado en
la tierra que el modelo dejó de contabilizar, cosecha en marzo-mayo) y las declaraciones del jugador
(obra en curso durante tres meses). Una situación ignorada **se ve** en el mapa mientras dura.

## 6. Dibujo (`src/territorio/IsoMap.tsx`, `sprites.ts`)

- **Variantes**: la variante de cada parcela sale de un hash de sus coordenadas en bloques de 3 × 3,
  con sesgo hacia la variante de su región (§3.2 del encargo).
- **Dos niveles de detalle**: por debajo de z = 0,5 se dibuja una imagen pre-renderizada del
  territorio completo (parcheada sólo donde cambió algo ese mes); por encima, parcela por parcela
  con animaciones. Medido: ≤ 5 ms por cuadro con 1.200 parcelas visibles.
- **Caminos**: las piezas rectas se recortan a la mitad de la parcela que tiene vecino, lo que da
  esquinas, T y finales sin arte propio; sólo el cruce de cuatro brazos usa su pieza (ver §6.1).
- **Transiciones animadas**: desmonte (bosque → cultivo), conversión agroecológica y restauración
  usan los sheets del encargo; el resto hace *crossfade*.
- **Capas**: las de análisis (carbono, biodiversidad, alimentos, economía) y la de "dónde puedo
  declarar" son capas cacheadas aparte, y el lote que tomaría una declaración se previsualiza bajo
  el puntero.

## 6.1 Orientación: lo que hubo que medir

El nombre de los archivos no alcanza. Midiendo la cobertura alfa en el punto medio de cada arista
del rombo y la dirección dominante de cada textura apareció que: las piezas de camino `ns`/`ew`
están invertidas entre el set costero y los otros dos; las `t` de tierra y asfalto son curvas; el
puente lleva la calzada sobre el eje x; la costa lleva el agua hacia −x y +y; y `reforest_v1`,
`reforest_v4` y `restoration_v1` tienen las hileras cruzadas respecto de sus hermanas (se dibujan
espejadas). El agua no se tesela: el mar es una losa con degradado y el río se compone como los
caminos, con el arte por encima para la textura.

## 7. Qué no entró

- `railway` y `powerline`: el arte entregado es una tira más ancha que la parcela y no encaja en la
  grilla sin retoque.
- Tiles de borde (`edge_*`): el mapa es continuo por composición de variantes; meter un tile de
  transición sobre una parcela productiva rompería la regla de "cada parcela es un dato".
- Las 12 piezas de camino por material: el set entregado trae recta, T y cruce; con las rectas
  recortadas por brazo se cubren todos los casos, y las T no se usan porque no son consistentes
  entre materiales (§6.1).

## 8. Verificación

`npx tsc --noEmit` limpio, 163 tests en verde (los de territorio reescritos a la escala nueva, más
cobertura de lotes, de crecimiento urbano y de "una declaración nunca crea tierra"), `npm run sim`
idéntico (el juego de 3 niveles no se toca) y `npm run sim:territorio` con la calibración de F7.
Herramientas nuevas: `npx tsx scripts/territory-preview.ts <semilla>` (mapa cenital en PPM para
revisar la geografía) y `npx tsx scripts/territorio-perf.ts` (costo por mes de una partida completa);
`/territorio?perf=1` imprime ms por cuadro en la consola.
