# Mejora 06 — Nivel 1: añadir componente económico básico

## Contexto
Feedback del formulario: "El nivel 1 no tiene demasiado sentido. El único objetivo es ser
'sostenible' sin considerar el desarrollo económico. No es viable en el corto y mediano plazo
una economía basada solamente en políticas agroecológicas."

El objetivo es agregar un **mínimo de realismo económico en Nivel 1** sin rediseñar el nivel
completo. La solución más simple: si el jugador activa SOLO políticas ambientales extremas (todas
las verdes, ninguna productiva), las reservas del tesoro empiezan a bajar, reflejando el costo
real de políticas sin financiamiento productivo.

Esto se implementa ajustando los `costFactor` de las políticas más costosas y añadiendo
un umbral mínimo de seguridad económica visible en el Nivel 1.

---

## Archivo: `constants.ts`

### Cambio 1: Hacer visible `economicSecurity` como indicador de alerta en Nivel 1

En el `chatbotSystemInstruction` del Nivel 1, agregar una línea para que DecarboNito mencione
la economía si cae muy bajo:

**Buscar** (dentro de `chatbotSystemInstruction` del Nivel 1, línea ~507):
```ts
**NO menciones de forma prominente otros indicadores** como Seguridad Alimentaria/Económica o Estabilidad Política, a menos que el jugador pregunte. No discutas PBI Real, Deuda, ni Reservas del Tesoro.
```

**Reemplazar con:**
```ts
**NO menciones de forma prominente** Seguridad Alimentaria, Estabilidad Política, PBI Real ni Deuda. Sin embargo, si la Seguridad Económica cae por debajo de 20 o las Reservas del Tesoro son negativas, ADVIERTE al jugador que el costo de sus políticas supera los ingresos de la nación y que necesita considerar alguna política productiva para sostener el financiamiento.
```

### Cambio 2: Ajustar `costFactor` de políticas de conservación para hacerlas ligeramente más costosas

Las políticas más costosas actualmente tienen `costFactor: 0.05`. Mantener ese valor, pero
asegurarse de que `CarbonNeutrality` tenga un costo acorde a su ambición:

**Buscar** la definición de `CarbonNeutrality` en `INITIAL_POLICIES` (línea ~106 aprox):
```ts
costFactor: 0.06,
```

**Reemplazar con:**
```ts
costFactor: 0.07,  // Increased: carbon neutrality is ambitions and expensive — teaches fiscal tradeoff
```

### Cambio 3: Win condition del Nivel 1 — agregar condición económica mínima

Para que el jugador aprenda que la economía importa, agregar un requisito mínimo de reservas
o seguridad económica en las condiciones de victoria del Nivel 1:

**Buscar** (línea ~528, `winConditions` del Nivel 1):
```ts
    winConditions: {
      puntajeGeneralMin: 600,
      biodiversityMin: 40,
      co2EqEmissionsPerCapitaMax: 5,
      nativeForestTotalMinPercentage: 0.18,
    }
```

**Reemplazar con:**
```ts
    winConditions: {
      puntajeGeneralMin: 600,
      biodiversityMin: 40,
      co2EqEmissionsPerCapitaMax: 5,
      nativeForestTotalMinPercentage: 0.18,
      economicSecurityMin: 20,  // NEW: minimum economic floor — pure-green portfolio without productive policies will fail
    }
```

---

## Nota sobre la fórmula de score del Nivel 1

En `App.tsx`, la fórmula del Nivel 1 es:
```ts
finalScore = (indicators.biodiversity * 0.5) + (carbonScore * 0.5);
```

Opcionalmente, si se desea que la economía también afecte el score (recomendado para coherencia):

**Buscar** en `App.tsx`:
```ts
if (currentLevel === 1) {
    finalScore = (indicators.biodiversity * 0.5) + (carbonScore * 0.5);
```

**Reemplazar con:**
```ts
if (currentLevel === 1) {
    // Added small economic component to teach that sustainability requires fiscal viability
    const econScore = Math.min(100, Math.max(0, indicators.economicSecurity));
    finalScore = (indicators.biodiversity * 0.40) + (carbonScore * 0.45) + (econScore * 0.15);
```

> Este cambio es el más sensible. Si tras probarlo el juego se vuelve demasiado difícil en Nivel 1,
> reducir el peso de `econScore` a `0.10` y ajustar los otros proporcionalmente.

---

## Verificación
1. `npm run dev`
2. Activar SOLO las 5 políticas verdes más costosas (Conservación, Agroecológica, Carbono, etc.)
3. Después de 10-15 años, las reservas deben bajar y el indicador económico debe caer.
4. DecarboNito debe advertir sobre el problema económico si la seguridad económica cae < 20.
5. Para ganar el Nivel 1, ahora se necesita mantener al menos `economicSecurity >= 20`.
6. `npm run build` — sin errores TypeScript.
