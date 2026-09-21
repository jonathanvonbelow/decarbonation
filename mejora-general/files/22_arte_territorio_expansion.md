# 22 — Brief de arte visual: expansión del mapa de DecarboNation Territorio

**Para:** equipo de generación de imágenes (Grok)
**De:** DecarboNation — vista previa "Territorio" (`https://decarbonation.vercel.app/territorio`)
**Objetivo:** generar el set completo de arte isométrico (imágenes estáticas + animaciones) para un mapa
cinco veces más grande, con cuatro regiones diferenciadas, nuevos usos del suelo y trama urbana
expansible.

> **Qué NO hay que hacer en este documento:** no hay que programar mecánicas. La lógica de expansión
> urbana, de las nuevas regiones y de los nuevos usos se implementa después, en el motor de simulación.
> Lo que se necesita ahora es **el arte**, generado con las especificaciones exactas de abajo para que
> entre al juego sin retoques.

---

## 1. Contexto mínimo del juego

DecarboNation es un simulador de política climática (sector AFOLU: agricultura, bosques y otros usos
del suelo). "Territorio" es la versión en vista previa: **una región, 30 años, mes a mes**, sobre un
mapa isométrico que se redibuja solo cuando el modelo mueve superficie de un uso a otro (deforestación,
conversión a agroecología, restauración…). El jugador no pinta el mapa: sólo declara **usos públicos**
(áreas protegidas, humedales, bosques de restauración, parques energéticos); todo lo demás sale de las
ecuaciones.

Consecuencia para el arte: **cada parcela es un dato del modelo**, no decoración. Dos parcelas del mismo
uso tienen que leerse como el mismo uso aunque el dibujo sea distinto — de ahí las variantes.

### Estado actual (lo que ya existe)

- Mapa de **12 × 12 = 144 parcelas**; 120 productivas × 5 kHa = **600 kHa**.
- **14 tiles** en `public/assets/ecosim/tiles/` (192×192 WebP RGBA): `forest`, `grass`, `industry`,
  `intensive`, `market`, `orchard`, `pasture`, `reforest`, `regen`, `solar`, `urban`, `water`,
  `wetland`, `wind`.
- **1 sola variante por elemento** (excepto agroecológico, que alterna entre `regen` y `orchard`): el
  mapa se ve repetitivo. Ese es el problema principal que este encargo resuelve.
- 4 retratos de actores en `public/assets/ecosim/portraits/`: `citizen`, `farmer`, `industry`, `ngo`.

---

## 2. Contrato técnico (obligatorio, sin excepciones)

Todo lo que se entregue tiene que cumplir esto **exactamente**, o no entra al motor sin retrabajo
manual. El archivo de referencia canónico es `public/assets/ecosim/tiles/grass.webp`.

| Parámetro | Valor |
|---|---|
| Lienzo | **192 × 192 px**, cuadrado exacto |
| Formato de entrega | **WebP RGBA** (calidad 90+ o lossless) — y el PNG RGBA de origen |
| Fondo | **100 % transparente**. Nada de fondo blanco, negro, magenta ni checkerboard |
| Proyección | Isométrica **2:1** (dimétrica clásica de videojuego), cámara fija, sin variación de ángulo |
| Luz | Desde **arriba a la izquierda**, elevación ~30°, idéntica en todos los assets |
| Sombra | Sólo la sombra de contacto **dentro** del bloque de tierra. **Prohibida** la sombra proyectada sobre el fondo transparente |
| Contorno | Sin borde, sin outline, sin líneas de grilla dibujadas |
| Texto | Ningún texto, número, logo ni marca de agua sobre el tile |

### 2.1 Geometría de la parcela (crítico)

El motor apoya cada sprite sobre un rombo de suelo con una posición fija. Medido sobre el arte actual:

```
Lienzo 192 × 192
Rombo superior (la "cara" de la parcela, donde se apoya todo):
    centro       (96, 102)        ← ±2 px de tolerancia
    ancho        181 px           (x = 5 … 187)
    alto          90 px           (y = 57 … 147)   proporción 2:1 exacta
    vértices     arriba (96, 57)  derecha (187, 102)  abajo (96, 147)  izquierda (5, 102)

Espacio libre hacia arriba  : y = 8 … 57   → altura de árboles, edificios, torres
Espesor del bloque de tierra: y = 147 … 173 → caras laterales del terrón
Margen inferior reservado   : y = 173 … 192 → sólo para edificios muy altos (ver urban.webp)
```

Reglas que se derivan de esto:

1. **La cara del rombo es la referencia de todo.** El motor dibuja anillos de selección, contornos de
   área protegida y capas de color justo sobre ese rombo. Si el arte está desplazado, el jugador hace
   clic en una parcela y se le selecciona la de al lado.
2. El rombo del arte (181 px) es **más ancho que la celda lógica** (el motor la escala a 96 px en una
   grilla de 96 × 48). Es a propósito: los tiles se solapan ~20 % y el mapa se ve denso y continuo.
   **No agregar márgenes "para que no se pisen".**
3. Lo que sobresale hacia arriba (copas, techos, torres) **puede** invadir el espacio del vecino de
   atrás: el motor dibuja de atrás hacia adelante y eso genera la profundidad. Lo que **no** puede es
   salir del lienzo de 192 px.
4. Los cuatro vértices del rombo tienen que estar "cerrados" (suelo hasta el borde) en todos los tiles
   de terreno, para que no aparezcan huecos negros entre parcelas.

### 2.2 Cómo entra al juego

Los archivos van a `public/assets/ecosim/tiles/` y el motor los carga por nombre
(`/assets/ecosim/tiles/<nombre>.webp`, ver `src/territorio/IsoMap.tsx`). Por eso **el nombre del archivo
es parte del entregable**: las tablas de la sección 5 fijan los nombres exactos.

### 2.3 Legibilidad sobre fondo oscuro y bajo capas de color

- El mapa se dibuja sobre un degradado casi negro (`#0e1a16` → `#08100e`). Los tiles tienen que tener
  suficiente luminosidad propia; nada de verdes tan oscuros que desaparezcan.
- El juego tiñe las parcelas con capas de análisis (carbono, biodiversidad, alimentos, economía):
  un velo verde `rgba(111,208,140,α)` o naranja `rgba(232,97,60,α)` con α hasta 0.62. **El elemento
  debe seguir siendo reconocible por su silueta y su textura con ese velo encima**, no sólo por su
  color. Silueta primero, color después.
- Prueba rápida de validación: pasar el tile a escala de grises. Si no se distingue de otro uso del
  suelo, hay que rediseñarlo.

### 2.4 Paleta del proyecto

Usarla como referencia de armonía; el terreno puede salirse de ella, los elementos construidos y los
acentos no.

| Rol | Hex |
|---|---|
| Fondo profundo / basalto | `#08100e` · `#0e1a16` · `#16241f` · `#1f332c` · `#2b4239` |
| Hueso (claro principal) | `#e9e7df` |
| Ceniza (gris medio) | `#a3b0a9` · `#6e7c76` |
| Clorofila (positivo, naturaleza) | `#6fd08c` |
| Ocre (alerta suave, cosecha) | `#e0a458` |
| Brasa (negativo, fuego, daño) | `#e8613c` |
| Hidro (agua, energía limpia) | `#5fb3c9` |

---

## 3. Dirección de arte

**Una sola dirección de arte para todo el mapa.** Es la del set actual: ilustración isométrica
semi-realista, textura pictórica fina, escala de "maqueta" o diorama, materiales creíbles (tejas,
chapa, tierra arada, agua turbia), sin contorno negro, sin estética *cartoon*, sin pixel art.
Referencias internas: `forest.webp` (masa boscosa con copas individuales distinguibles),
`urban.webp` (caserío de tejas rojas y patios), `intensive.webp` (surcos rectos sobre tierra),
`water.webp` (agua turquesa con orilla de canto rodado).

### 3.1 Qué significa "4 estilos por elemento"

**No** son cuatro direcciones de arte distintas: cuatro tiles con estéticas diferentes conviviendo en
la misma pantalla rompen el mapa. Significa **4 variantes de diseño del mismo elemento, dentro de la
misma dirección de arte**, intercambiables entre sí.

El motor elige una variante por parcela con un hash determinista de sus coordenadas, así que:

- Las 4 variantes de un elemento tienen que **compartir el mismo rombo, el mismo espesor de tierra y
  la misma dominante de color**. Si `forest_v2` es notoriamente más claro que `forest_v1`, el mapa se
  ve manchado.
- Tienen que diferenciarse en **composición**: densidad, disposición, orientación, especies, detalle
  incidental (una roca, un sendero, un tajo de agua, un galpón, un animal). Suficiente para que el ojo
  no detecte el patrón de repetición; no tanto como para que parezcan usos distintos.
- Variar **una sola cosa por variante** funciona mejor que variar todo: v1 canónica, v2 más densa,
  v3 con accidente del terreno, v4 con huella humana.

### 3.2 Afinidad regional de las variantes

Cuando el elemento lo permita, ordená las 4 variantes según las cuatro regiones (sección 4): la v1 con
carácter del Norte agrícola, la v2 del Centro metropolitano, la v3 del Sur boscoso, la v4 de la Costa.
El juego va a sesgar la elección hacia la variante afín a la región de la parcela, pero **cualquier
variante tiene que funcionar en cualquier región** — es un sesgo, no una restricción. Los elementos
donde esto importa están marcados con **[R]** en las tablas.

---

## 4. El mapa nuevo: ×5 de superficie y cuatro regiones

### 4.1 Dimensiones

| | Actual | Nuevo |
|---|---|---|
| Grilla | 12 × 12 = 144 parcelas | **26 × 26 = 676 parcelas** |
| Parcelas productivas | 120 | **600** |
| kHa por parcela | 5 | 5 (sin cambio) |
| **Superficie total** | **600 kHa** | **3.000 kHa (×5)** |
| Parcelas de contexto (agua, ciudad, industria…) | 24 | **76** |

### 4.2 Las cuatro regiones

La grilla de 26 × 26 se divide en cuatro cuadrantes de **13 × 13 = 169 parcelas** cada uno. Cada
cuadrante es una de las cuatro regiones que ya existen en el nivel 2 del juego original
(`INITIAL_REGIONAL_ZONES_DATA` en `src/constants.ts`). Los datos socioeconómicos son los del juego; el
carácter visual es lo que hay que traducir a imagen.

| Región | Cuadrante | Productivas / contexto | Datos del juego | Carácter visual a construir |
|---|---|---|---|---|
| **Norte Agrícola** | Noroeste | 158 / 11 | 1,5 M hab., IDH 0,65, empleo 60 %, agricultura extensiva y ganadería, pequeña agroindustria, balance de carbono *estable* | Llanura abierta, horizonte amplio. Parcelas grandes y regulares, alambrados, molinos de viento, silos, caminos de tierra, álamos en línea como cortina rompevientos. Tierra ocre-parda, verdes secos. Caseríos bajos dispersos, galpones de chapa. Polvo. |
| **Centro Metropolitana** | Noreste | 126 / **43** | 5 M hab., IDH 0,78, empleo 75 %, servicios e industria, alta densidad, balance de carbono *empeorando* | La única región con ciudad real: manzanas densas, edificios en altura, avenidas, parques industriales, playas de maniobra, cables y antenas. Periurbano de quintas y horticultura bajo cubierta. Grises, ladrillo, hormigón, chapa. Es la región que se expande sobre las demás. |
| **Sur Boscoso y Turístico** | Suroeste | 160 / 9 | 0,8 M hab., IDH 0,72, empleo 65 %, conservación, turismo sostenible, forestería, balance de carbono *mejorando* | Relieve: lomadas, afloramientos rocosos, arroyos. Bosque nativo denso y húmedo, helechos, troncos caídos, niebla baja. Construcción en madera y piedra: refugios, cabañas, miradores, senderos. Verdes profundos y azulados. |
| **Costera Pesquera** | Sureste | 156 / 13 | 1,2 M hab., IDH 0,68, empleo 55 %, pesca, acuicultura, turismo costero, plantas de procesamiento | Borde de mar: playa, médanos, pastizal salino, escolleras. Muelles de madera, botes pintados, redes tendidas, galpones de acopio, cámaras de frío. Turquesas, arena clara, madera gastada por la sal, óxido. |

**Transición entre regiones:** el mapa es continuo, no cuatro mapas pegados. Entregar además tiles de
**borde/transición** (sección 5.6) para que el pasto seco del Norte se funda con el bosque húmedo del
Sur sin una línea recta visible.

### 4.3 Accidentes geográficos que cruzan el mapa

- Un **río** que nace en el Sur boscoso, atraviesa el Centro y desemboca en la Costa (el motor ya
  dibuja un río meandroso, una parcela por columna).
- **Humedales** en las riberas.
- **Lomadas y afloramientos rocosos** en el Sur.
- **Línea de costa** en todo el borde sureste.

---

## 5. Inventario de assets a generar

Convención de nombres: `<clave>_v<n>.webp`, con `n` de 1 a 4. Ejemplo: `forest_v1.webp` …
`forest_v4.webp`. Sin mayúsculas, sin espacios, sin acentos.

### 5.1 Usos del suelo del modelo (los que el simulador mueve)

Estos nueve son los que las ecuaciones contabilizan. **Su lectura tiene que ser inequívoca**: el
jugador toma decisiones de política mirando el mapa.

| Clave | Uso del suelo | Qué se ve | Variantes |
|---|---|---|---|
| `forest` **[R]** | Bosque nativo no protegido | Masa boscosa nativa, copas irregulares de distintas especies y alturas, sotobosque. Sin plantación en línea | 4 |
| `forest_protected` **[R]** | Bosque nativo protegido (área protegida) | El mismo bosque, más maduro y cerrado, con señal discreta de reserva: mojón, cartel de madera, sendero de guardaparques, alambrado perimetral bajo. **Sin** logos ni texto legible | 4 |
| `regen` **[R]** | Cultivos agroecológicos | Parcelas chicas y mezcladas, franjas de flores y cortinas vegetales entre cultivos, bordes irregulares, compost, biodiversidad visible | 4 |
| `orchard` | Cultivos agroecológicos (variante frutal) | Frutales en cuadrícula abierta con cobertura verde entre hileras, colmenas | 4 |
| `intensive` **[R]** | Cultivos convencionales | Monocultivo en surcos rectos, parcela grande y uniforme, suelo desnudo entre líneas, pivote de riego o maquinaria grande | 4 |
| `reforest` | Plantaciones forestales | Árboles idénticos en grilla regular, calles de manejo, pila de rollizos, tocones. Se tiene que distinguir del bosque nativo **de un vistazo** | 4 |
| `pasture` **[R]** | Praderas y pasturas para ganadería | Pastizal con ganado, alambrado, aguada, sombra de árbol aislado. Intensidad de pisoteo variable entre variantes | 4 |
| `wetland_public` | Humedal público (uso declarable) | Espejo de agua somero con juncos, aves zancudas, pasarela de madera, cartel de sitio protegido | 4 |
| `restoration` | Bosque de restauración (uso declarable) | Plantines nativos con tutores y protectores individuales, suelo en recuperación, mulch, cerco de exclusión ganadera. Se ve **joven**, es lo contrario de `forest` | 4 |
| `energy_solar` | Parque energético — solar | Filas de paneles fotovoltaicos, caminos de servicio, inversores, cerco perimetral | 4 |
| `energy_wind` | Parque energético — eólico | Aerogeneradores sobre pastizal, con el suelo todavía en uso ganadero debajo | 4 |
| `fallow` | Barbecho / tierra sin uso | Tierra desnuda o rastrojo, malezas, erosión incipiente. Es lo que aparece cuando una sequía se lleva superficie de cultivo: tiene que leerse como **pérdida**, no como descanso prolijo | 4 |

**Subtotal: 48 imágenes.**

### 5.2 Contexto natural (no productivo)

| Clave | Qué se ve | Variantes |
|---|---|---|
| `water_river` | Cauce de río con orillas; el agua tiene que poder empalmar con la parcela vecina en las cuatro direcciones | 4 |
| `water_lake` | Espejo de agua cerrado, orilla vegetada | 4 |
| `wetland_natural` | Bañado natural, mezcla de agua y vegetación palustre | 4 |
| `coast` **[R]** | Línea de costa: mar de un lado, playa y médano del otro. Entregar las 4 orientaciones posibles del borde | 4 |
| `rocky` | Afloramiento rocoso / lomada pedregosa con vegetación rala | 4 |
| `grass` | Pastizal natural sin uso productivo (fondo neutro del mapa) | 4 |

**Subtotal: 24 imágenes.**

### 5.3 Trama urbana expansible

Esta es la novedad funcional: **las áreas urbanas van a poder crecer**. La mecánica se implementa
después, pero el arte tiene que venir preparado por **niveles de densidad**, de modo que una parcela
pueda pasar de un nivel al siguiente y el jugador lo vea crecer.

Regla de continuidad entre niveles: **el nivel N+1 tiene que leerse como el mismo lugar más
desarrollado** — misma orientación de la calle principal, mismos edificios reconocibles todavía en pie
donde tenga sentido, más altura y más ocupación. No son tres lugares distintos.

#### Vivienda

| Clave | Nivel | Qué se ve | Variantes |
|---|---|---|---|
| `housing_1` **[R]** | Caserío rural | 3–5 casas bajas, huerta, gallinero, camino de tierra, mucho espacio libre | 4 |
| `housing_2` **[R]** | Pueblo | Manzana consolidada de casas con techo a dos aguas, patios, vereda, algún comercio en planta baja | 4 |
| `housing_3` **[R]** | Barrio urbano | Edificios de 3–6 pisos, medianeras, tanques de agua, terrazas, autos en la calle | 4 |
| `housing_4` | Torres | Torres de 10+ pisos con basamento, cocheras, poca tierra libre. Sólo Centro Metropolitana | 4 |
| `housing_informal` | Asentamiento informal | Autoconstrucción densa en pendiente, chapa y bloque, tendido eléctrico precario, sin calle trazada. **Sin caricatura ni miseria pintoresca**: es una forma de urbanización real y debe dibujarse con dignidad | 4 |

#### Comercio y abastecimiento

| Clave | Nivel | Qué se ve | Variantes |
|---|---|---|---|
| `market_1` **[R]** | Feria / mercado de barrio | Puestos con toldos, cajones de verdura, gente, camioneta descargando | 4 |
| `market_2` | Centro comercial | Galería o supermercado con playa de estacionamiento, cartelería genérica sin marcas | 4 |
| `logistics` | Acopio y logística | Silos, galpón de acopio, camiones, báscula, playa de carga | 4 |

#### Industria y energía

| Clave | Qué se ve | Variantes |
|---|---|---|
| `industry_1` **[R]** | Taller / pequeña agroindustria: galpón de chapa, patio de maniobras, un camión | 4 |
| `industry_2` | Parque industrial: naves alineadas, cerco, playón, chimeneas con humo tenue | 4 |
| `industry_3` | Complejo pesado: chimeneas altas, tanques, cintas transportadoras, penacho de humo (la versión que se ve *sucia*) | 4 |
| `fishing_port` **[R]** | Puerto pesquero: muelle, botes amarrados, redes, grúa chica, galpón de acopio | 4 |
| `processing_plant` | Planta de procesamiento de pescado: cámaras de frío, playa de camiones, gaviotas | 4 |
| `power_plant` | Central térmica fósil (la alternativa "sucia" al parque energético) | 4 |

#### Equipamiento y servicios

| Clave | Qué se ve | Variantes |
|---|---|---|
| `school` | Escuela: patio, mástil, aulas en U, cancha | 4 |
| `health` | Centro de salud / hospital según densidad | 4 |
| `civic` | Edificio público: plaza, municipalidad, iglesia, pérgola | 4 |
| `tourism` **[R]** | Equipamiento turístico: hostería, cabañas, mirador, estacionamiento de visitantes (sobre todo Sur y Costa) | 4 |
| `water_treatment` | Planta de tratamiento: piletas de decantación, cerco | 4 |
| `waste_site` | Disposición de residuos: celda, maquinaria, aves. Se tiene que ver como un problema | 4 |

**Subtotal urbano: 80 imágenes.**

### 5.4 Caminos e infraestructura lineal

Los caminos no llevan variantes de estilo sino **piezas de conexión**. Cada pieza es un tile completo
de 192 × 192 con el camino atravesando la cara del rombo y empalmando **exactamente en el punto medio
de cada arista**, para que cualquier pieza encaje con cualquier otra.

Piezas requeridas (12): recta NE-SO, recta NO-SE, curva ×4 (una por par de aristas), T ×4, cruce,
final de camino.

Cada juego de 12 piezas en **3 materiales**: `road_dirt_*` (tierra, Norte y Sur), `road_paved_*`
(asfalto, Centro), `road_coastal_*` (camino costero con arena invadiendo el borde).

Además, sueltos (4 variantes cada uno): `bridge` (puente sobre el río), `railway` (vía férrea, 4
piezas: 2 rectas + 2 curvas), `powerline` (línea de alta tensión atravesando la parcela).

**Subtotal infraestructura: 36 piezas de camino + 4 puentes + 4 vías + 4 líneas = 48 imágenes.**

### 5.5 Decoradores de estado (capas encima del tile)

Se dibujan **sobre** un tile de terreno ya existente, así que van en un lienzo de 192 × 192 con el
mismo encuadre pero **con el terreno transparente**: sólo el elemento que se superpone. Sirven para
mostrar lo que le pasa a una parcela sin duplicar cada uso del suelo.

| Clave | Qué se ve | Variantes |
|---|---|---|
| `fx_fire` | Incendio: llamas y humo | 3 |
| `fx_drought` | Sequía: suelo agrietado, vegetación amarilleada, velo de polvo | 3 |
| `fx_flood` | Inundación: lámina de agua con vegetación asomando y reflejo | 3 |
| `fx_pest` | Plaga: manchas en el cultivo, insectos, sectores secos | 3 |
| `fx_construction` | Obra en curso: andamios, excavadora, montículo de tierra, vallado | 3 |
| `fx_harvest` | Cosecha en curso: maquinaria, polvo, parcela a medio cosechar | 3 |
| `fx_protest` | Movilización: grupo de personas, banderas sin texto legible, corte de camino | 3 |
| `fx_wildlife` | Fauna recuperada: aves, guanacos o ciervos, huellas | 3 |
| `fx_smog` | Contaminación del aire: velo pardo sobre la parcela | 3 |
| `fx_degradation` | Degradación del suelo: cárcavas, erosión, salinización | 3 |

**Subtotal: 30 imágenes.**

### 5.6 Bordes y transiciones

Piezas para fundir una región con la vecina sin una línea recta visible. Por cada par de biomas
contiguos, una pieza de transición en las 4 orientaciones:

`edge_pampa_bosque`, `edge_bosque_costa`, `edge_pampa_urbano`, `edge_urbano_costa`,
`edge_bosque_rocoso`, `edge_agua_tierra` — 6 pares × 4 orientaciones = **24 imágenes**.

### 5.7 Retratos y actores (ampliación)

Los 4 retratos actuales (`citizen`, `farmer`, `industry`, `ngo`) acompañan las situaciones que le
llegan al jugador. Con 100 situaciones distintas, hacen falta más caras y más diversidad.

Formato: **192 × 192 RGBA**, fondo transparente (sin fondo de color: el actual venía con croma y hubo
que recortarlo a mano), busto de tres cuartos, misma dirección de arte, iluminación consistente.

| Clave | Actor | Variantes |
|---|---|---|
| `farmer` | Productor/a agropecuario/a | 4 |
| `citizen` | Vecino/a | 4 |
| `industry` | Empresariado / industria | 4 |
| `ngo` | Organización ambiental | 4 |
| `scientist` | Ciencia y técnica | 4 |
| `mayor` | Gobierno local | 4 |
| `union` | Sindicato / trabajadores | 4 |
| `fisher` | Pescador/a artesanal | 4 |
| `indigenous` | Comunidad originaria | 4 |
| `youth` | Juventud / estudiantes | 4 |
| `journalist` | Prensa | 4 |
| `investor` | Inversor internacional | 4 |

**Diversidad obligatoria:** las 4 variantes de cada actor tienen que variar en edad, género y fenotipo.
Nada de que "productor" sean cuatro señores mayores iguales. Sin estereotipos: la comunidad originaria
no se dibuja con vestimenta ceremonial genérica, el sindicalista no es un matón, la ONG no es una
caricatura hippie.

**Subtotal: 48 imágenes.**

---

## 6. Animaciones

El mapa es un canvas que ya corre a 60 fps, así que las animaciones se integran como **sprite sheets**,
no como GIF. Pedimos las dos cosas:

1. **GIF** (para revisar y aprobar rápido): loop perfecto, 12 fps, fondo transparente.
2. **Sprite sheet PNG RGBA** (lo que entra al juego): fotogramas en **una sola fila horizontal**, cada
   fotograma de **192 × 192**, en orden de izquierda a derecha. Un sheet de 8 fotogramas mide
   1536 × 192. Nombre: `<clave>_sheet_<n>f.png` (ej. `water_river_sheet_8f.png`).

Requisitos de todos los loops: **8 a 12 fotogramas**, **loop perfecto** (el último empalma con el
primero sin salto), movimiento **sutil** — el mapa entero animado a la vez marea. Amplitud máxima:
unos pocos píxeles.

| Clave | Qué se anima | Fotogramas |
|---|---|---|
| `water_river` | Corriente y brillos del agua | 12 |
| `water_lake` | Ondas suaves | 8 |
| `coast` | Rompiente de olas en la orilla | 12 |
| `wetland_natural` | Juncos al viento + reflejo | 8 |
| `energy_wind` | Aspas girando (el loop tiene que cerrar exacto: 1/3 de vuelta con 3 palas) | 12 |
| `energy_solar` | Destello recorriendo los paneles | 8 |
| `industry_2` / `industry_3` | Humo saliendo de la chimenea | 12 |
| `power_plant` | Penacho de vapor | 12 |
| `fx_fire` | Llamas y humo | 12 |
| `fx_smog` | Velo que se desplaza | 8 |
| `fx_harvest` | Cosechadora avanzando | 12 |
| `fx_protest` | Banderas y movimiento de la multitud | 8 |
| `pasture` | Ganado que se desplaza lentamente | 8 |
| `forest` | Copas mecidas por el viento (muy sutil) | 8 |
| `housing_3` / `housing_4` | Ventanas que se encienden (ciclo lento) | 8 |
| `fishing_port` | Botes cabeceando en el agua | 8 |

**Subtotal: 16 animaciones × (1 GIF + 1 sheet) = 32 archivos.**

### 6.1 Transición de cambio de uso (importante)

Cuando el modelo convierte una parcela, el juego hace un *crossfade* de un segundo entre el sprite
viejo y el nuevo. Tres transiciones merecen animación propia, porque son el corazón narrativo del
juego (`<origen>_to_<destino>_sheet_12f.png`):

| Clave | Qué cuenta |
|---|---|
| `forest_to_intensive` | Deforestación: el bosque cae y queda el surco. Tiene que doler |
| `intensive_to_regen` | Conversión agroecológica: aparecen las franjas de flores y los bordes |
| `fallow_to_restoration` | Restauración: se plantan los plantines con sus tutores |

---

## 7. Resumen de volumen

| Bloque | Imágenes |
|---|---|
| 5.1 Usos del suelo del modelo | 48 |
| 5.2 Contexto natural | 24 |
| 5.3 Trama urbana | 80 |
| 5.4 Caminos e infraestructura | 48 |
| 5.5 Decoradores de estado | 30 |
| 5.6 Bordes y transiciones | 24 |
| 5.7 Retratos | 48 |
| 6 Animaciones (GIF + sheet) | 32 |
| 6.1 Transiciones animadas | 3 |
| **Total** | **337 archivos** |

Si hay que priorizar por tiempo, este es el orden: **5.1 → 5.3 → 5.2 → 6 → 5.7 → 5.5 → 5.4 → 5.6.**
Con 5.1 y 5.3 completos el mapa ya se puede armar y jugar.

---

## 8. Entrega

```
territorio-arte/
  tiles/            # 5.1, 5.2, 5.3, 5.6  → <clave>_v<n>.webp  (+ .png de origen)
  roads/            # 5.4                 → road_<material>_<pieza>.webp
  fx/               # 5.5                 → fx_<clave>_v<n>.webp
  portraits/        # 5.7                 → <actor>_v<n>.webp
  anim/
    gif/            # <clave>_v<n>.gif
    sheets/         # <clave>_sheet_<n>f.png
  contactsheet.png  # todas las miniaturas en una grilla, para revisar de un vistazo
  README.md         # qué se entregó, qué quedó pendiente, decisiones tomadas
```

### Checklist de QA antes de entregar

- [ ] Lienzo exacto de 192 × 192 en todos los archivos.
- [ ] Fondo completamente transparente (verificado sobre fondo negro **y** sobre fondo magenta).
- [ ] Centro del rombo en (96, 102) ± 2 px, ancho ~181 px, alto ~90 px.
- [ ] Sin sombra proyectada fuera del bloque de tierra.
- [ ] Las 4 variantes de cada elemento comparten dominante de color y volumen (probar las 4 lado a lado).
- [ ] Cada tile sigue siendo reconocible en escala de grises.
- [ ] Cada tile sigue siendo reconocible con un velo verde o naranja al 60 %.
- [ ] Los tiles de terreno cierran los 4 vértices del rombo (sin huecos entre parcelas).
- [ ] Los loops cierran sin salto (reproducir 3 veces seguidas y mirar el empalme).
- [ ] Las piezas de camino empalman en el punto medio exacto de cada arista.
- [ ] Ningún texto, logo, marca ni firma sobre el arte.

### Prueba de integración sugerida

Armar un mosaico de 6 × 6 parcelas mezclando las 4 variantes de 3 o 4 usos distintos, sobre fondo
`#0e1a16`, con los tiles escalados a 124 px sobre una grilla de 96 × 48 px. Si en ese mosaico se ve el
patrón de repetición, se nota un salto de color entre variantes o aparecen huecos en las uniones, hay
que corregir antes de producir el resto del set.

---

## 9. Anexo: cómo se conecta con el código (referencia para el equipo de desarrollo)

- Los tiles se cargan en `src/territorio/IsoMap.tsx`: `TILE_FOR_KIND` mapea cada `ParcelKind` a un
  nombre de archivo y `spriteName(kind, x, y)` elige la variante. Hoy sólo hay un caso de variante
  (agroecológico → `orchard` en el 30 % de las parcelas, por hash de coordenadas); con este set,
  `spriteName` pasa a elegir `_v1…_v4` con el mismo hash, más el sesgo regional de §3.2.
- La geometría está en las constantes `TW = 96`, `TH = 48`, `SPR = 124`, `FACE_DY = -28` del mismo
  archivo. Los números de §2.1 salen de ahí; si alguna vez cambian, este brief queda desactualizado.
- El tamaño del territorio está en `src/sim/territory.ts` (`TERRITORY_SIZE = 12`,
  `KHA_PER_PARCEL = 5`). Pasar a 26 × 26 es cambiar esa constante, pero **hay que recalibrar** el
  reparto de parcelas por región, el costo de los usos públicos y las rutas de victoria: el modelo
  razona en kHa y multiplicar la superficie por 5 cambia todas las escalas. Eso es trabajo de motor,
  posterior a este encargo.
- Los estados nuevos (niveles urbanos, decoradores) todavía no existen en el modelo: el arte se genera
  primero y la mecánica de expansión urbana se implementa después, sobre estos assets.
