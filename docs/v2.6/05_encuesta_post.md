# U5 — Encuesta post-juego (`SurveyPost`)

## 1. Cuándo se muestra

El componente `SurveyPost` se muestra cuando la partida finaliza por cualquier motivo:

- **Victoria o derrota**: `gameState.gameOverReason` se vuelve truthy. En `App.tsx` existe un
  `useEffect` (alrededor de la línea 575-580) que ya escucha ese cambio:

  ```ts
  useEffect(() => {
    if (gameState.gameOverReason && !hasSentFinalDecarbonitoMessage) {
      setHasSentFinalDecarbonitoMessage(true);
      handleLessonsLearnedStart();  // hoy abre PlayerReportModal
    }
  }, [gameState.gameOverReason, hasSentFinalDecarbonitoMessage, handleLessonsLearnedStart]);
  ```

  Este es el **hook natural** donde también se deberá activar la encuesta (ver sección 2).

- **Abandono manual**: cuando el usuario elige "Abandonar partida" (botón o menú
  correspondiente) se fija un `gameOverReason` con valor `'abandono'`, o bien la UI dispara
  directamente `setShowPostSurvey(true)`.

## 2. Pasos de cableado en U9

En `App.tsx`, dentro de la Unidad 9 (integración final OAuth + Supabase), realizar los
siguientes cambios:

1. Añadir estado de visibilidad:
   ```ts
   const [showPostSurvey, setShowPostSurvey] = useState(false);
   ```

2. Modificar el `useEffect` existente de `gameOverReason` para lanzar la encuesta además de
   (o después de) la reflexión de DecarboNito:
   ```ts
   useEffect(() => {
     if (gameState.gameOverReason && !hasSentFinalDecarbonitoMessage) {
       setHasSentFinalDecarbonitoMessage(true);
       handleLessonsLearnedStart();
       setShowPostSurvey(true);   // <-- nuevo
     }
   }, [gameState.gameOverReason, hasSentFinalDecarbonitoMessage, handleLessonsLearnedStart]);
   ```

3. Renderizar el componente condicionalmente (junto a los demás modales):
   ```tsx
   {showPostSurvey && (
     <SurveyPost
       resultado={mapGameOverReasonToResultado(gameState.gameOverReason)}
       nivelAlcanzado={gameState.currentLevel}
       onComplete={handlePostSurveyComplete}
       onSkip={() => setShowPostSurvey(false)}
     />
   )}
   ```

   Donde `mapGameOverReasonToResultado` convierte el string de `gameOverReason` al tipo
   `'victoria' | 'derrota' | 'abandono'`.

## 3. Flujo de datos

Cuando el jugador completa la encuesta, `onComplete(data: PostSurveyData)` se invoca con
todas las respuestas. El handler `handlePostSurveyComplete` en `App.tsx` debe:

```ts
const handlePostSurveyComplete = async (data: PostSurveyData) => {
  setShowPostSurvey(false);

  if (userId && sessionId) {
    // Persiste las respuestas de la encuesta
    await supabaseService.insertPostSurvey(userId, sessionId, data);

    // Cierra la sesión de juego con resultado final
    await supabaseService.finalizeGameSession(
      sessionId,
      mapGameOverReasonToResultado(gameState.gameOverReason),
      gameState.currentLevel
    );
  }
  // Si no hay userId/sessionId (modo demo) no se persiste nada.
};
```

Las funciones de Supabase a implementar (en `services/supabaseService.ts`):

| Función | Tabla destino | Descripción |
|---|---|---|
| `insertPostSurvey(userId, sessionId, data)` | `post_survey_responses` | Inserta fila con todas las columnas de `PostSurveyData` más `user_id`, `session_id`, `created_at` |
| `finalizeGameSession(sessionId, resultado, nivel)` | `game_sessions` | UPDATE: setea `ended_at = now()`, `resultado`, `nivel_alcanzado` donde `id = sessionId` |

## 4. Modo demo

Si no hay `sessionId` ni `userId` (el jugador no inició sesión con Google OAuth), la encuesta
**igual se muestra** — proporciona feedback valioso aunque no sea persistido. El handler
simplemente omite las llamadas a Supabase (ver la guarda `if (userId && sessionId)` en el
ejemplo anterior).

Opcionalmente se puede mostrar un mensaje al finalizar la encuesta en modo demo:
> "Sesión no autenticada — tus respuestas no han sido guardadas."

Esto evita confusión sin degradar la experiencia del usuario no autenticado.
