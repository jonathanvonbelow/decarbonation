# Mejora 05 — Rebalanceo: Presión Agrícola más manejable

## Contexto
Tres usuarios del formulario reportaron que la presión agrícola es "muy difícil de bajar" o
"no pudo gestionarla". Revisando los factores en `constants.ts`:

- `Factor_Presion_Agricola_PAS`: +2.5 (Políticas Agroecológicas la SUBE — contra-intuitivo)
- `Factor_Presion_Agricola_PGS`: +1.5 (Ganadería Sostenible también la sube)
- `Factor_Presion_Agricola_PPAI`: -12.5 (solo Agricultura Intensiva la baja significativamente)
- `Factor_Presion_Agricola_PPEA`: -7.5 (Exportaciones Agrícolas también la baja)

El problema es estructural: para bajar la presión agrícola el jugador se ve "forzado" a activar
políticas contaminantes (PPAI, PPEA), lo que crea un dilema frustrante en lugar de interesante.

---

## Archivo: `constants.ts`

### Cambios requeridos en los factores de presión agrícola

**Buscar** (línea ~432):
```ts
  Factor_Presion_Agricola_PAS: 2.5,       
  Factor_Presion_Agricola_PGS: 1.5,       
  Factor_Presion_Agricola_PPAI: -12.5,     
  Factor_Presion_Agricola_PPEA: -7.5,
```

**Reemplazar con:**
```ts
  Factor_Presion_Agricola_PAS: -2.0,      // FIX: Agroecological should REDUCE agricultural pressure (farmers benefiting)
  Factor_Presion_Agricola_PGS: -1.5,      // FIX: Sustainable livestock also benefits farmers → reduces pressure  
  Factor_Presion_Agricola_PPAI: -10.0,    // Slightly reduced — still the main lever but less dominant
  Factor_Presion_Agricola_PPEA: -6.0,     // Slightly reduced
```

### Cambio en sensibilidad de seguridad alimentaria para presión agrícola

La presión agrícola también sube automáticamente cuando la seguridad alimentaria está baja.
El umbral actual (60) es muy alto, disparando presión constantemente.

**Buscar** (línea ~457):
```ts
  Sensibilidad_PP_Agricola_SegAlimentaria: 0.3,
  Umbral_PP_Agricola_SegAlimentaria: 60,
```

**Reemplazar con:**
```ts
  Sensibilidad_PP_Agricola_SegAlimentaria: 0.2,  // Reduced sensitivity — less punishing
  Umbral_PP_Agricola_SegAlimentaria: 50,          // Lower threshold — only triggers at truly critical food security
```

### Ajuste tasa de disipación agrícola en Nivel 1

La presión agrícola en nivel 1 disipa muy lento (0.10). Subirlo levemente para que los jugadores
nuevos no queden atrapados:

**Buscar** (línea ~372):
```ts
  Tasa_disipacion_agricola_Nivel_1: 0.10, Tasa_disipacion_agricola_Nivel_2: 0.08, Tasa_disipacion_agricola_Nivel_3: 0.06,
```

**Reemplazar con:**
```ts
  Tasa_disipacion_agricola_Nivel_1: 0.13, Tasa_disipacion_agricola_Nivel_2: 0.09, Tasa_disipacion_agricola_Nivel_3: 0.06,
```

---

## Razonamiento del cambio

| Antes | Lógica problemática | Después | Lógica correcta |
|-------|--------------------|---------|-----------------| 
| PAS sube presión agrícola | Agricultores se oponen a políticas agroecológicas | PAS baja presión agrícola | Agricultores que adoptan agroecología están más conformes |
| Solo PPAI baja presión | Jugador forzado a contaminar para contentar al sector | PAS + GS + PPAI + PPEA bajan presión | Múltiples caminos para gestionar el sector agrícola |

---

## Verificación
1. `npm run dev`
2. Iniciar partida nueva, activar "Políticas Agroecológicas".
3. Después de 3-4 años, la presión agrícola debe mostrar tendencia descendente (no ascendente).
4. Activar "Ganadería Sostenible" debe también reducir la presión agrícola.
5. El sector agrícola sigue siendo desafiante, pero ahora existe un camino "verde" para gestionarlo.
6. `npm run build` — sin errores TypeScript.
