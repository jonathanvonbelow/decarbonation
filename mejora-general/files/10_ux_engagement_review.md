# 10 — Revisión de criterios de diseño: UX, enganche y difusión en juegos serios

> Documento de referencia. No contiene instrucciones de código: contiene el marco de evaluación, el
> diagnóstico de DecarboNation v2.6 y el backlog priorizado que justifica los archivos 11–20.
> Leer completo antes de ejecutar cualquier otro archivo del paquete.

---

## 1. El problema central de los juegos serios

Un juego serio falla de dos maneras opuestas, y ambas son fáciles de alcanzar:

- **Falla lúdica:** es riguroso pero nadie quiere jugarlo. Se percibe como un formulario animado.
- **Falla pedagógica:** engancha pero no enseña. El jugador optimiza la métrica sin construir ningún
  modelo mental del sistema real.

DecarboNation v2.6 está más cerca del primer polo, con un síntoma específico del segundo: **los
jugadores no pueden articular qué aprendieron**. Ese es el hallazgo más importante del feedback, y
no es un problema de UX de superficie: es un problema de *diseño del bucle de aprendizaje*.

El marco de referencia operativo es el ciclo experiencial: **acción → consecuencia visible →
atribución causal → reflexión → transferencia**. DecarboNation tiene sólida la primera y la segunda
etapa (el motor calcula y grafica), y prácticamente vacías las tres últimas. La atribución causal
está rota porque el jugador ve *que* el indicador bajó, pero no *por qué*; la reflexión está delegada
a un modal opcional al final; y la transferencia no se mide.

---

## 2. Marco de evaluación: 10 dimensiones

Escala: **1** = ausente · **2** = presente pero deficiente · **3** = funcional · **4** = bueno ·
**5** = distintivo.

| # | Dimensión | Qué evalúa | v2.6 | Meta v3.0 |
|---|-----------|-----------|:----:|:---------:|
| D1 | Onboarding y tiempo hasta la primera decisión | ¿Cuánto tarda un novato en tomar una decisión con consecuencia visible? | 2 | 4 |
| D2 | Legibilidad causal | ¿Puede el jugador atribuir cada cambio de indicador a una decisión propia? | 2 | 5 |
| D3 | Agencia y espacio de estrategias | ¿Hay varias formas legítimas de jugar bien? | 1 | 4 |
| D4 | Curva de dificultad y flujo | ¿El desafío acompaña la habilidad creciente? | 2 | 4 |
| D5 | *Game feel* (jugosidad) | Microrrespuesta del sistema a cada acción | 1 | 4 |
| D6 | Identidad y ficción | ¿El jugador siente que *es* alguien con un rol y un dilema? | 2 | 4 |
| D7 | Progresión y rejugabilidad | ¿Hay razones para volver a jugar distinto? | 1 | 4 |
| D8 | Debriefing y transferencia | ¿El juego cierra el ciclo de aprendizaje explícitamente? | 2 | 5 |
| D9 | Capa social y facilitación | ¿Funciona en taller, en grupo, con roles? | 3 | 4 |
| D10 | Difusión y primer contacto | Landing, credibilidad, fricción de entrada, compartibilidad | 1 | 4 |

---

## 3. Diagnóstico por dimensión

### D1 · Onboarding y tiempo hasta la primera decisión — **2/5**

**Estado.** Al iniciar aparece un `TutorialModal` de 8 diapositivas de texto denso, seguido de un
`LevelIntroModal` con la lista de condiciones de victoria. Un jugador cumplidor lee ~1.200 palabras
antes de tocar nada; un jugador típico cierra ambos modales sin leer y queda desorientado.

**Por qué falla.** Es documentación disfrazada de tutorial. Explica el sistema completo antes de que
el jugador tenga ninguna pregunta, y por lo tanto ningún gancho donde colgar la información. Los dos
modales compiten: el segundo llega cuando la atención ya se gastó.

**Criterio objetivo.** *Time To First Decision* (TTFD) < 90 s, y **primera consecuencia visible**
antes de los 3 minutos. Hoy el jugador debe activar políticas, asignar esfuerzo y recién entonces
simular: la primera retroalimentación real puede tardar 5–8 minutos.

**Corrección.** Archivo `18`: apertura en frío. El tablero aparece de inmediato, DecarboNito
propone una única acción concreta ("activá Conservación de Bienes Naturales y simulá un año"), y
todo lo demás se enseña por *coach marks* contextuales en el momento en que cada mecánica aparece
por primera vez.

---

### D2 · Legibilidad causal — **2/5** · *dimensión crítica*

**Estado.** Tras simular un año cambian 8–13 números simultáneamente. El `GameLogPanel` registra
eventos en texto plano. Los gráficos históricos muestran tendencias pero no marcan qué decisión
tomó el jugador en cada punto.

**Por qué falla.** La atribución causal es la operación cognitiva que el juego *debe* entrenar, y es
justamente la que está sin soporte. Sin ella, el jugador aprende heurísticas supersticiosas
("activar muchas políticas es mejor") en lugar de comprender trade-offs intersectoriales.

**Correcciones (archivos 19 y 15).**
1. **Desglose de la variación anual.** Al cerrar el año, cada indicador muestra su delta descompuesto
   por fuente: `Biodiversidad +3,2 = políticas +4,1 · uso del suelo −0,6 · evento −0,3`. El motor ya
   calcula estos términos por separado; solo hay que exponerlos en un objeto `trace` (ver `16` §3).
2. **Marcadores de decisión en las series históricas.** Cada activación/desactivación de política
   deja un pin en el eje X de los gráficos de tendencia.
3. **Consecuencias diferidas explícitas.** Varias políticas tienen efectos con retardo. El juego debe
   nombrarlo: "el efecto de Conservación sobre el secuestro se hace visible recién en 2–3 años".
   Sin esto, el jugador desactiva políticas que estaban a punto de funcionar.
4. **Predicción antes de simular.** Antes de avanzar el año, ofrecer una micro-apuesta opcional:
   "¿qué indicador creés que va a bajar más?". Comparar predicción vs resultado es la técnica más
   barata y más efectiva para forzar la formación de un modelo mental explícito — y produce el dato
   de investigación más valioso para el estudio de aprendizaje social.

---

### D3 · Agencia y espacio de estrategias — **1/5** · *dimensión crítica*

**Estado.** `progressionConditionsMet` del Nivel 2 exige simultáneamente 10 condiciones
(`puntaje ≥ 480 AND biodiversidad ≥ 45 AND CO₂ ≤ 6 AND alimentaria ≥ 50 AND económica ≥ 40 AND
bienestar ≥ 50 AND estabilidad ≥ 45 AND las tres presiones < 55`). Una conjunción de 10 umbrales
colapsa el espacio de estrategias a un único punto óptimo.

**Por qué falla.** El mensaje implícito contradice la tesis del juego. DecarboNation quiere enseñar
que la descarbonización admite trayectorias distintas con distintos ganadores y perdedores; el
sistema de victoria enseña que hay una respuesta correcta y que las demás son errores.

**Precedente aprovechable.** El Nivel 3 ya implementa "6 de 10 objetivos" para ganar. Esa lógica
disyuntiva es correcta y debe generalizarse.

**Corrección (archivo 17).** Núcleo de salvaguardas no negociable (evitar colapso) + **tres rutas
doctrinarias nombradas** por nivel, cada una con su propio final, su badge y sus preguntas de
debriefing. Ganar por "Pacto Productivo" y ganar por "Guardián del Bosque" deben ser experiencias
narrativamente distintas.

---

### D4 · Curva de dificultad y flujo — **2/5**

**Estado.** El feedback reporta que la presión agrícola es muy difícil de bajar (ya rebalanceada) y
que el Nivel 2 se siente como un salto abrupto. No hay dificultad seleccionable ni forma de
recuperarse de una mala racha salvo reiniciar el nivel.

**Criterios.**
- Tasa de victoria de Nivel 1 en primer intento: **objetivo 55–70%**. Si es menor, el onboarding
  frustra; si es mayor, no enseña nada.
- Nivel 2 primer intento: 30–45%. Nivel 3: 20–35%.
- Estos números se miden con el harness Monte Carlo (`16` §6) *y* con datos reales de Supabase.
- **Ningún estado del juego debe ser irrecuperable sin aviso.** Si el jugador entra en espiral de
  colapso, DecarboNito debe avisarlo 2 años antes, no anunciar el game over.

**Correcciones.** Rutas múltiples (`17`) aplanan la dificultad naturalmente. Además: alerta temprana
de trayectoria de colapso y opción "reintentar el año" una vez por nivel (con registro en telemetría
—rehacer una decisión tras ver su consecuencia es un evento de aprendizaje, no una trampa).

---

### D5 · *Game feel* — **1/5**

**Estado.** Presionar "Simular Próximo Año" ejecuta un bloque síncrono y repinta números. No hay
transición, ni conteo animado, ni sonido, ni acuse de recibo. La acción más importante del juego se
siente como enviar un formulario.

**Por qué importa.** La jugosidad no es decoración: es el canal por el cual el sistema le comunica
al jugador que su acción importó. Un juego serio sin *feedback* táctil se percibe como una encuesta,
y la percepción de "encuesta" desactiva el modo exploratorio.

**Correcciones (archivo 19).** Secuencia de avance de año orquestada (~1,2 s): el año rueda, la
cinta de carbono se inclina hacia emisiones o secuestro, los deltas suben desde cada tile, los
eventos entran en cascada. Micro-interacciones en cada switch de política y cada slider de esfuerzo.
Todo respetando `prefers-reduced-motion` y con opción de saltar la animación (clic durante la
secuencia la completa de inmediato — nunca hacer esperar dos veces al jugador experto).

---

### D6 · Identidad y ficción — **2/5**

**Estado.** El jugador es un "responsable de gobierno" genérico de una nación sin nombre, sin
oposición encarnada, sin plazo político. Las presiones sectoriales son barras, no actores.

**Corrección.** Bajo costo, alto retorno: dar cara y voz a los tres grupos de presión. Cuando la
presión agrícola supera 60, no basta con que la barra se ponga roja: debe entrar un titular
("La Federación Agraria convoca a un paro de 72 horas") y un actor con nombre. El motor de titulares
por IA del Nivel 3 ya existe — **extenderlo a todos los niveles y anclarlo a las presiones**.
DecarboNito, como asesor con personalidad (archivo `13`), es la otra mitad de esta capa.

---

### D7 · Progresión y rejugabilidad — **1/5**

**Estado.** Se juega una vez, se gana o se pierde, no hay razón para volver. No hay finales
distintos, ni logros, ni comparación con otras partidas, ni desafíos.

**Correcciones.**
- **Finales por ruta** (`17`): 3 finales por nivel + epílogo de país al terminar el Nivel 3.
- **Registro de doctrinas**: qué rutas ya conseguiste, cuáles te faltan.
- **Modo desafío** (opcional, bajo costo): escenarios preconfigurados —"heredás un país con
  biodiversidad en 25 y deuda alta"— ideales para taller porque igualan el punto de partida de todos
  los equipos.
- **Comparativa anónima**: "el 62% de quienes jugaron eligió priorizar economía en el año 3". Dato
  agregado desde Supabase, altísimo valor pedagógico para el debriefing grupal.

---

### D8 · Debriefing y transferencia — **2/5** · *dimensión crítica*

**Estado.** Existe `PlayerReportGuideModal` con buenas preguntas, pero es opcional, aparece al
final, y depende de que el jugador quiera escribir. La "Reflexión con DecarboNito" es un botón que
manda un prompt genérico.

**Por qué falla.** El aprendizaje no ocurre en la experiencia: ocurre en la reflexión sobre la
experiencia. Si el debriefing es opcional, el aprendizaje es opcional.

**Correcciones (archivo 18).**
1. **Debriefing por nivel, no solo al final.** 3 preguntas al cerrar cada nivel, no 15 al final.
2. **Anclado en datos de la partida propia.** No "¿qué aprendiste sobre trade-offs?" sino "en 2031
   activaste Agricultura Intensiva y la biodiversidad cayó 12 puntos en dos años. ¿Lo esperabas?".
   Esto requiere que el motor guarde el `trace` (ver `16`).
3. **Diferenciado por ruta ganadora**: quien ganó por doctrina productivista recibe preguntas sobre
   los costos ecológicos que aceptó; quien ganó por conservación, sobre los costos sociales.
4. **Exportable**: PDF/markdown con la trayectoria de la partida y las respuestas. En taller esto se
   vuelve el insumo de la discusión plenaria, y en investigación es dato primario.

---

### D9 · Capa social y facilitación — **3/5**

**Estado.** Es la dimensión mejor resuelta: el Manual del Facilitador propone roles, mecanismos de
decisión y pausas de reflexión. Falta soporte *dentro* del producto.

**Correcciones de bajo costo (dentro de este ciclo).**
- **Vista proyector**: modo de alto contraste y tipografía grande para pantalla compartida.
- **Congelar y discutir**: botón que pausa y muestra el estado en formato de "reunión de gabinete".
- **Tarjetas de rol imprimibles** en la landing (archivo `20`).

El Modo Facilitador completo permanece fuera de alcance.

---

### D10 · Difusión y primer contacto — **1/5**

**Estado.** La URL de Vercel abre directamente el juego. No hay landing, ni descripción, ni prueba
social, ni tarjeta de previsualización al compartir el link, ni forma de compartir un resultado.

**Por qué importa para un proyecto académico.** El indicador de éxito del ciclo IKI incluye alcance
institucional. Un link sin *preview* compartido en WhatsApp o LinkedIn se ve como spam. Cuatro
bloques de actores distintos necesitan cuatro entradas distintas al mismo producto, cada una
respondiendo a "¿qué gano yo con esto?" en los primeros 10 segundos.

**Correcciones (archivo `20`).**
- Landing con: qué es en una frase, el dilema central mostrado no explicado, credibilidad
  institucional (FCF–UNaM, Fundación Bariloche, IKI), y **"Jugar ahora"** sin registro.
- Meta tags Open Graph con imagen generada.
- **Tarjeta de resultado compartible**: PNG con la ruta ganada, el puntaje y dos estadísticas
  llamativas. Es el vector de difusión orgánica más barato que existe.
- PWA instalable: en talleres con conectividad pobre (una constante en trabajo territorial), el
  shell offline evita el desastre.

---

## 4. Backlog priorizado

Puntuación: **Impacto** (1–5) × **Confianza** (0–1) ÷ **Esfuerzo** (jornadas). Ordenado por score.

| Ítem | Dim. | I | C | E | Score | Archivo |
|------|:----:|:-:|:-:|:-:|:-----:|---------|
| Vías múltiples de victoria | D3 | 5 | 0,9 | 1,5 | 3,0 | `17` |
| Desglose causal de deltas anuales | D2 | 5 | 0,9 | 1,5 | 3,0 | `19`+`16` |
| i18n completo (inglés sin residuos) | — | 4 | 1,0 | 2,0 | 2,0 | `12` |
| Debriefing por nivel anclado en datos | D8 | 5 | 0,8 | 2,0 | 2,0 | `18` |
| Apertura en frío / TTFD < 90 s | D1 | 4 | 0,9 | 2,0 | 1,8 | `18` |
| DecarboNito flotante con personaje | D5,D6 | 4 | 0,8 | 2,5 | 1,3 | `13`,`14` |
| Auditoría de ecuaciones + tests | D2,D4 | 5 | 0,9 | 3,5 | 1,3 | `16` |
| Secuencia de avance de año (juice) | D5 | 3 | 0,9 | 2,0 | 1,4 | `19` |
| Actores con cara para las presiones | D6 | 3 | 0,7 | 1,5 | 1,4 | `19` |
| Landing + tarjeta compartible | D10 | 4 | 0,8 | 2,5 | 1,3 | `20` |
| Design system y estética | D5 | 3 | 0,9 | 3,0 | 0,9 | `11`,`19` |
| Agente de acciones en lenguaje natural | D1,D2 | 4 | 0,6 | 4,0 | 0,6 | `15` |
| Modo desafío / escenarios | D7 | 3 | 0,6 | 2,0 | 0,9 | futuro |

> El agente de acciones tiene el score más bajo del paquete P0/P1 por su alto esfuerzo e
> incertidumbre. Se mantiene porque es un pedido explícito y porque, bien hecho, resuelve D1 y D2 de
> una forma que ningún otro ítem puede: enseñar la interfaz *operándola*. Pero debe construirse
> **después** de que la interfaz esté estabilizada, nunca antes.

---

## 5. Métricas a instrumentar en Supabase

Sin estas métricas, las decisiones de diseño del próximo ciclo vuelven a ser opinión. Todas se
derivan de eventos ya registrables; el esquema va en `15` §7.

| Métrica | Definición | Objetivo v3.0 |
|---------|-----------|---------------|
| TTFD | s entre carga y primera política activada | < 90 s (p50) |
| Tasa de primera simulación | % de sesiones que simulan ≥ 1 año | > 85% |
| Profundidad de sesión | años simulados por sesión | ≥ 12 (p50) |
| Victoria N1 primer intento | % | 55–70% |
| Diversidad de rutas | % de victorias por cada ruta | ninguna > 60% |
| Uso de DecarboNito | % de sesiones con ≥ 1 consulta | > 45% |
| Predicción antes de simular | % de años con predicción emitida | > 30% |
| Calibración predictiva | acierto de predicción por año de partida | creciente |
| Completitud de debriefing | % de partidas con debrief completo | > 60% |
| Abandono por paso de tutorial | drop-off por step | ningún paso > 15% |

La **calibración predictiva creciente a lo largo de la partida** es la variable dependiente más
defendible para el artículo sobre aprendizaje social: es una medida conductual de formación de
modelo mental, no una autopercepción declarada.

---

## 6. Antipatrones a evitar

1. **Gamificación superficial.** Puntos, badges y rachas *añadidos encima* de un sistema que no
   engancha no arreglan nada y desplazan la motivación intrínseca. Los badges de este plan (`17`)
   marcan *rutas doctrinarias distintas*, no cantidad de uso.
2. **El asesor IA como muleta.** Si DecarboNito da la respuesta óptima, el jugador deja de razonar.
   Debe hacer preguntas socráticas y mostrar trade-offs, no recetas. La regla vigente de brevedad
   (≤120 palabras) va en la dirección correcta; hay que sumarle una regla de no-prescripción.
3. **Realismo que no se puede percibir.** Agregar variables que el jugador no puede observar ni
   influir aumenta el costo cognitivo sin aumentar el aprendizaje. Toda variable nueva debe ser
   visible, atribuible y accionable.
4. **Texto donde debería haber sistema.** Si una regla necesita explicarse en un párrafo del manual,
   probablemente la interfaz debería mostrarla. Cada párrafo del tutorial es una deuda de diseño.
5. **Confundir "les gustó" con "aprendieron".** La satisfacción declarada correlaciona débilmente
   con aprendizaje. Por eso la métrica central es conductual (calibración predictiva), no encuestal.

---

## 7. Cómo se usa este documento

- Es el argumento que justifica el alcance del ciclo ante el equipo y ante el reporte IKI.
- La tabla de la §2 se vuelve a puntuar **al cierre del ciclo**, por dos personas por separado, para
  medir el delta.
- Las métricas de §5 son el contrato con el archivo `15` (telemetría): si un evento no está en esta
  lista, no se instrumenta; si está, es obligatorio.
