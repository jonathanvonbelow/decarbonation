# Mejora 04 — Valores iniciales de CO2 y emisiones más realistas

## Contexto
Feedback del Taller Interno: "los niveles iniciales de carbono y emisiones deberían ser más o menos
realistas (por ej. no empezar en cero)."

Actualmente en `constants.ts`:
- `co2EqEmissionsPerCapita` inicial = **10 t/cápita** (en `INITIAL_INDICATORS`)
- El stock `Conteo_Carbono_Neut` empieza en **0**
- `Reservas_del_Tesoro` = 1000 (razonable)
- `PBI_Real` = 10000 (razonable)

El valor de 10 t/cápita es alto (equivale a países desarrollados contaminantes).
Para una nación ficticia de ~10M habitantes con economía mediana, un valor inicial más realista
y pedagógicamente útil es **6-7 t/cápita**, que deja margen para subir o bajar con las políticas.

---

## Archivo: `constants.ts`

### Cambio 1: CO2 inicial en `INITIAL_INDICATORS`

**Buscar** (línea ~265):
```ts
  co2EqEmissionsPerCapita: 10,
```

**Reemplazar con:**
```ts
  co2EqEmissionsPerCapita: 6.5,  // More realistic starting point for a mid-income nation (~10M pop)
```

### Cambio 2: Ajustar la referencia máxima de scoring para mantener balance

El parámetro `Referencia_Max_CO2_per_Capita_Puntaje` define el "peor caso" para calcular el score
de carbono. Si bajamos el valor inicial, este techo también se puede ajustar para que el juego
siga siendo desafiante.

**Buscar** (línea ~345):
```ts
  Referencia_Max_CO2_per_Capita_Puntaje: 15,
```

**Reemplazar con:**
```ts
  Referencia_Max_CO2_per_Capita_Puntaje: 12,  // Adjusted ceiling — keeps scoring meaningful with lower starting emissions
```

### Cambio 3: Win condition del Nivel 1 — ajustar el techo de CO2 para ganar

Con el valor inicial en 6.5, la condición de ganar el nivel 1 (`co2EqEmissionsPerCapitaMax: 8`)
sigue siendo alcanzable (el jugador debe bajar de 6.5 a 8... es trivial).
Bajar el umbral para que siga siendo un desafío real:

**Buscar** (línea ~531, dentro de `winConditions` del Nivel 1):
```ts
      co2EqEmissionsPerCapitaMax: 8,
```

**Reemplazar con:**
```ts
      co2EqEmissionsPerCapitaMax: 5,  // More challenging: player must actively reduce from 6.5 starting point
```

---

## Verificación
1. `npm run dev`
2. Al iniciar una nueva partida, el indicador "CO2eq/cápita" debe mostrar **6.5 t**.
3. El puntaje inicial de carbono debe ser distinto de cero (refleja que hay emisiones desde el inicio).
4. La condición de ganar el Nivel 1 ahora requiere bajar activamente las emisiones.
5. `npm run build` — sin errores TypeScript.
