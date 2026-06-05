# U4 — Encuesta pre-juego (`SurveyPre`)

## 1. Cuándo se muestra

El componente `SurveyPre` se muestra **después del login exitoso** (OAuth o sesión anónima) y **antes del primer render del tablero de juego**. El momento exacto de disparo es inmediatamente tras confirmar que el usuario tiene una sesión activa (o se ha creado una nueva sesión anónima), pero antes de montar el componente principal de juego.

## 2. Cómo U9 la cablea en `App.tsx`

U9 agrega en `App.tsx`:

```tsx
// Estado
const [showPreSurvey, setShowPreSurvey] = useState(false);

// Disparo tras auth exitosa
useEffect(() => {
  if (userId && !preSurveyCompleted) {
    setShowPreSurvey(true);
  }
}, [userId]);

// Render condicional — antes del tablero
{showPreSurvey && (
  <SurveyPre
    onComplete={handlePreSurveyComplete}
    onSkip={handlePreSurveySkip}
  />
)}
```

El boolean `preSurveyCompleted` puede persistirse en `localStorage` o derivarse de un campo en la sesión de Supabase para evitar mostrar la encuesta en sesiones repetidas del mismo usuario.

## 3. Flujo de datos

```
SurveyPre.onComplete(data: PreSurveyData)
  └─> App.tsx: handlePreSurveyComplete(data)
        └─> supabaseService.insertPreSurvey(userId, sessionId, data)
              └─> INSERT INTO pre_survey_responses (...) VALUES (...)
        └─> setShowPreSurvey(false)
        └─> setPreSurveyCompleted(true)
```

El objeto `PreSurveyData` se pasa directamente a `supabaseService.insertPreSurvey`. Este servicio es responsable de mapear los campos al esquema de la tabla `pre_survey_responses` en Supabase.

Ejemplo de implementación en `supabaseService`:

```ts
async insertPreSurvey(
  userId: string,
  sessionId: string,
  data: PreSurveyData
): Promise<void> {
  await supabase.from('pre_survey_responses').insert({
    user_id: userId,
    session_id: sessionId,
    vinculo_clima: data.vinculo_clima,
    experiencia_simulacion: data.experiencia_simulacion,
    familiaridad_afolu: data.familiaridad_afolu,
    expectativa: data.expectativa,
    pais_region: data.pais_region,
    comentario_abierto: data.comentario_abierto ?? null,
    created_at: new Date().toISOString(),
  });
}
```

## 4. Campos obligatorios vs. opcionales

| Campo | Tipo | Obligatorio |
|---|---|---|
| `vinculo_clima` | `string` | Sí |
| `experiencia_simulacion` | `string` | Sí |
| `familiaridad_afolu` | `number` (1-5) | Sí |
| `expectativa` | `string` | Sí |
| `pais_region` | `string` | Sí |
| `comentario_abierto` | `string` | **No** (opcional) |

El botón "Finalizar" del último paso está **deshabilitado** hasta que `pais_region` tenga un valor no vacío. `comentario_abierto` puede quedar sin llenar; en ese caso se envía como `undefined` desde el componente y el servicio lo almacena como `null` en Supabase.

## 5. Botón "Omitir encuesta"

Al presionar "Omitir encuesta", se llama `onSkip()`. El handler en `App.tsx` debe:

1. Llamar `setShowPreSurvey(false)` para ocultar el modal.
2. **No** llamar a `supabaseService.insertPreSurvey` — los datos quedan vacíos (sin fila) en Supabase para esa sesión.
3. Opcionalmente marcar `preSurveyCompleted = true` en `localStorage` para no volver a mostrar la encuesta en recargas de la misma sesión.

```tsx
const handlePreSurveySkip = () => {
  setShowPreSurvey(false);
  setPreSurveyCompleted(true);
  // No se insertan datos en Supabase
};
```
