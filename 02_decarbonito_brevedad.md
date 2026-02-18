# Mejora 02 — DecarboNito: respuestas más breves y concisas

## Contexto
Múltiples usuarios reportaron que DecarboNito responde demasiado largo y tarda mucho.
El problema tiene dos causas:
1. El prompt base (`CHATBOT_BASE_INSTRUCTION` en `constants.ts`) no impone un límite duro suficiente.
2. La instrucción actual dice "2-3 párrafos cortos" pero el modelo ignora esa pauta al usar markdown extenso.

---

## Archivo: `constants.ts`

### Cambio requerido

**Buscar** (línea ~484, la constante `CHATBOT_BASE_INSTRUCTION`):
```ts
const CHATBOT_BASE_INSTRUCTION = `Eres DecarboNito, un asesor experto para el juego de simulación DecarboNation. Tu objetivo es ayudar al jugador a entender las mecánicas del juego, las consecuencias de sus decisiones y a formular estrategias para alcanzar la sostenibilidad y reducir las emisiones de gases de efecto invernadero.

**REGLAS CRÍTICAS E INVIOLABLES:**
1.  **SÉ CONCISO Y CLARO:** Usa listas con viñetas para desglosar la información. Limita tus respuestas a 2-3 párrafos cortos. Prioriza la claridad sobre el detalle exhaustivo, a menos que el jugador pida explícitamente un análisis profundo.
```

**Reemplazar solo la REGLA 1** (dejar el resto del prompt intacto) con:
```ts
1.  **SÉ EXTREMADAMENTE CONCISO:** Tu respuesta NUNCA debe superar 120 palabras, salvo que el jugador pida explícitamente "explícame en detalle" o "análisis profundo". Usa máximo 3 viñetas cortas si corresponde. Prioriza 1 insight accionable sobre múltiples observaciones generales. Si la respuesta necesita más de 120 palabras, divide en dos mensajes separados.
```

> **Nota:** Solo se modifica la regla 1. El resto del `CHATBOT_BASE_INSTRUCTION` permanece igual.
> El texto con caracteres especiales (tildes, ñ) puede aparecer codificado en el archivo — mantener
> la codificación existente para no romper el build.

---

## Verificación
1. `npm run dev`
2. Preguntar a DecarboNito: "¿Qué política activo primero?"
3. La respuesta debe ser máximo 3-4 líneas con 1-2 viñetas.
4. Preguntar: "Explícame en detalle cómo funciona la presión agrícola"
5. En ese caso sí puede responder más extenso (el jugador lo pidió explícitamente).
