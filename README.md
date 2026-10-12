# 🌿 DecarboNation 2.5: Strategic Decarbonization Game

**DecarboNation** es un juego de simulación de política pública donde el jugador toma el rol de responsable de gobierno de una nación ficticia y debe tomar decisiones estratégicas para alcanzar la sostenibilidad y la neutralidad de carbono — sin hundir la economía ni desestabilizar la sociedad en el camino.

Diseñado como herramienta de aprendizaje para talleres, cursos de posgrado y sesiones de formación en política climática, DecarboNation permite **experimentar las consecuencias sistémicas de las decisiones de política pública en un entorno seguro**, donde los errores estratégicos no tienen costo político real.

---

## 🎮 ¿Cómo se juega?

Cada turno representa **un año** de gestión. El jugador activa o desactiva políticas públicas, asigna esfuerzo a instrumentos específicos, gestiona finanzas nacionales y reacciona a eventos aleatorios (sequías, crisis económicas, movimientos sociales).

El juego monitorea en tiempo real un conjunto de **indicadores de sostenibilidad** y el jugador debe mantenerlos por encima de umbrales críticos para avanzar de nivel — y evitar el colapso.

### Indicadores clave

| Indicador | Qué mide |
|-----------|----------|
| 🌿 Biodiversidad | Salud de los ecosistemas naturales |
| 💨 CO₂eq/cápita | Emisiones de gases de efecto invernadero per cápita |
| 🌾 Seguridad Alimentaria | Capacidad de la nación de alimentar a su población |
| 💰 Seguridad Económica | Estabilidad financiera y productiva |
| 🤝 Bienestar Social | Cohesión social y calidad de vida |
| 🏛️ Estabilidad Política | Legitimidad y gobernabilidad del gobierno |
| 🌳 Bosque Nativo | Porcentaje del territorio con cobertura forestal nativa |

### Condiciones de Game Over
- Colapso político (gobernabilidad = 0)
- Colapso ecológico (biodiversidad = 0)
- Hambruna (seguridad alimentaria crítica)
- Bancarrota nacional (deuda insostenible + reservas agotadas)

---

## 🗺️ Estructura del juego: 3 niveles progresivos

### Nivel 1 — Estrategia Nacional Fundacional
Sentar las bases de la descarbonización. El foco es el sector **AFOLU** (Agricultura, Silvicultura y Otros Usos del Suelo): reducir emisiones per cápita, proteger el bosque nativo y mejorar la biodiversidad. Solo se pueden activar/desactivar políticas nacionales.

**Condiciones de victoria:** Puntaje ≥ 600 · Biodiversidad ≥ 40% · CO₂eq/cápita ≤ 5 t · Bosque nativo ≥ 18% del territorio · Seguridad económica ≥ 20%

### Nivel 2 — Coordinación Regional y Sostenibilidad Ampliada
La complejidad aumenta. Aparecen las **presiones políticas sectoriales** (sector agrícola, ambientalistas, sociedad) que pueden desestabilizar el gobierno. Se introducen los **instrumentos de política**: acciones específicas dentro de cada política con esfuerzo distribuible (0–100%).

**Condiciones de victoria:** Múltiples indicadores socioeconómicos y ambientales por encima de umbrales, con presiones políticas controladas.

### Nivel 3 — Liderazgo Global en Sostenibilidad
El nivel más complejo. Se suman **finanzas avanzadas** (PBI real, deuda, préstamos, impuestos adicionales), **pactos internacionales** (Acuerdo Global de Carbono, Tratado de Biodiversidad, Iniciativa de Transferencia Tecnológica) y eventos aleatorios más frecuentes e impactantes.

**Condiciones de victoria:** Neutralidad de carbono (CO₂eq ≤ 2 t/cápita), PBI ≥ 14.000, Deuda/PBI < 70%, y alto desempeño en todos los indicadores.

---

## 🏛️ Políticas disponibles

El jugador puede activar hasta **5 políticas simultáneas**, cada una con trade-offs reales:

| Política | Efecto principal | Trade-off |
|----------|-----------------|-----------|
| Políticas Agroecológicas | ↑ Biodiversidad, ↓ emisiones | Costo fiscal moderado |
| Conservación de Bienes Naturales | ↑↑ Biodiversidad, ↑ secuestro C | ↓ Seguridad alimentaria |
| Ganadería Sostenible | ↓ Emisiones metano, ↑ biodiversidad | Costo fiscal |
| Gestión Sostenible del Agua | ↑ Seguridad alimentaria | Costo fiscal |
| Neutralidad de Carbono | ↓↓ Emisiones, ↑ renovables | Costo fiscal alto |
| Agricultura Intensiva | ↑↑ Seguridad alimentaria | ↓↓ Biodiversidad, ↑ emisiones |
| Exportaciones Agrícolas | ↑↑ Seguridad económica | ↓ Seguridad alimentaria interna |
| Inversión Extranjera | ↑↑ Seguridad económica | Tensión social |
| Normativas Ambientales Flexibles | ↑ Economía corto plazo | ↓↓ Biodiversidad, ↑ presión ambientalista |
| Subsidios Energéticos | ↑ Seguridad económica corto plazo | ↑↑ Emisiones |

---

## 🤖 DecarboNito: tu asesor con IA

El juego incluye un chatbot powered by **Gemini API** llamado **DecarboNito**. Actúa como asesor estratégico contextual: conoce el estado actual de tu partida, las políticas activas, los indicadores y el nivel en que jugás. Podés preguntarle sobre mecánicas, trade-offs, estrategias o pedir análisis de tu situación actual.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Estilos | Tailwind CSS |
| Gráficos | Recharts |
| IA | Google Gemini API (`gemini-2.5-flash`) |
| Deploy | Vercel |

---

## 🚀 Correr localmente

**Prerequisitos:** Node.js v20+

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la API key de Gemini
# Crear archivo .env.local en la raíz del proyecto:
# GEMINI_API_KEY=tu_api_key_aqui
# Obtener key en: https://aistudio.google.com/app/apikey

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Build de producción
npm run build
```

---

## 📚 Uso en talleres y cursos

DecarboNation está diseñado para sesiones grupales e individuales. El juego incluye:

- **Manual del Jugador** — mecánicas completas, estrategias y consejos (accesible desde la interfaz)
- **Manual del Facilitador** — guía para conducir talleres, dinámicas grupales y preguntas de reflexión
- **Guía de Reflexión Post-Juego** — preguntas estructuradas para el debriefing
- **Manual de Ecuaciones** — documentación técnica completa de la simulación (acceso facilitador)

### Ideas para talleres en grupo
- **Juego de roles:** asignar roles de ministros sectoriales (Ambiente, Producción, Hacienda) que defienden sus intereses en cada decisión
- **Mecanismos de decisión:** consenso, votación o "presidente con voto de desempate"
- **Pausas para reflexión:** después de cada nivel o evento crítico, discutir qué funcionó y por qué
- **Uso de DecarboNito como árbitro técnico:** el chatbot como asesor imparcial durante los debates

---

## 📄 Licencia

Desarrollado originalmente en Google AI Studio. Proyecto académico orientado a la formación en política climática y toma de decisiones de sostenibilidad.

---

## 🌐 Páginas públicas

| Ruta | Qué es |
|------|--------|
| `/` | Landing (es/en) con las dos versiones |
| `/territorio` | **DecarboNation Territorio** — vista previa recomendada para aula y talleres: una región, mes a mes, sobre un mapa. Admite `?taller=CODIGO` |
| `/territorio/encuesta` | Cuestionario anónimo de 14 preguntas (agrupa por código de taller) |
| `/play` | Juego de 3 niveles (estable, paso anual); `/play?demo=1` es la demo guiada |
| `/docentes` | Paquete docente con variantes para las dos versiones |
| `/docentes/espacio` | Espacio docente asincrónico: recorrido autoguiado, generador de link de taller y QR |
