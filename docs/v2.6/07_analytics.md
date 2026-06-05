# U7 — Analytics interno: guía de uso

**DecarboNation v2.6 | Supabase backend para investigación**

Esta guía explica cómo consultar, exportar y monitorear los datos de las sesiones de juego usando el archivo `supabase/analytics_queries.sql`.

---

## 1. Cómo ejecutar las queries en Supabase Studio

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) e ingresa a tu proyecto.
2. En el menú lateral izquierdo, selecciona **SQL Editor**.
3. Haz clic en **New query** (o usa una pestaña existente).
4. Abre el archivo `supabase/analytics_queries.sql` del repositorio y copia la query que necesitas.
5. Pégala en el editor y presiona **Run** (o `Ctrl+Enter` / `Cmd+Enter`).
6. Los resultados aparecen en la tabla inferior. Puedes hacer clic en los encabezados de columna para ordenar.

> **Consejo:** Supabase Studio permite guardar queries con nombre. Guarda las más usadas con nombres descriptivos como `nps_score` o `sesiones_por_dia`.

---

## 2. Vista sugerida por sesión de análisis (post-taller)

Ejecuta las queries en este orden después de cada taller para obtener una imagen completa rápidamente:

| Orden | Sección | Query recomendada | Objetivo |
|-------|---------|-------------------|----------|
| 1 | S1 | Total sesiones por resultado | Confirmar que los datos se guardaron correctamente |
| 2 | S1 | Sesiones por día (últimos 30 días) | Ver si hay pico en la fecha del taller |
| 3 | S1 | Usuarios únicos autenticados vs demo | Medir alcance real del taller |
| 4 | S4 | Distribución vínculo_clima + top países | Caracterizar la audiencia |
| 5 | S5 | Promedios post (cambio_percepcion, utilidad_docente) + NPS | Evaluar impacto educativo |
| 6 | S2 | Score promedio por año agrupado por resultado | Ver curvas de aprendizaje |
| 7 | S3 | Políticas más usadas + top 5 combinaciones ganadoras | Identificar estrategias exitosas |
| 8 | S6 | Duración promedio por resultado | Detectar sesiones incompletas o atípicas |

---

## 3. Cómo exportar datos

### Opción A — Exportar desde Supabase Studio (CSV)

1. Ejecuta cualquier query en el SQL Editor.
2. Haz clic en el botón **Export** que aparece en la esquina superior derecha de la tabla de resultados.
3. Selecciona **CSV** o **JSON** según necesites.
4. El archivo se descarga automáticamente al navegador.

### Opción B — Exportar la vista completa `session_summary`

Si ya creaste la vista materializada `session_summary` (ver Sección 7 del SQL), puedes exportarla entera:

```sql
SELECT * FROM public.session_summary;
```

Luego usa el botón **Export** para descargar el CSV completo con todos los datos de una sesión.

### Opción C — Exportar via API REST con service key

Útil para automatizar exportaciones o integrar con Google Sheets / Python.

```bash
curl "https://<PROJECT_REF>.supabase.co/rest/v1/game_sessions?select=*" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

Reemplaza `<PROJECT_REF>` con el ID de tu proyecto y `<SERVICE_ROLE_KEY>` con la clave que encuentras en **Settings > API > service_role**.

> **Advertencia de seguridad:** La `service_role` key omite Row Level Security (RLS). Nunca la expongas en el frontend ni en repositorios públicos. Úsala solo en scripts de servidor o Edge Functions.

---

## 4. Edge Function para analytics privado

Cuando necesitas ejecutar queries que cruzan datos de múltiples usuarios (algo que RLS bloquea con la clave `anon`), la solución recomendada es una Edge Function de Deno que use la `service_role` key en el servidor.

### Por qué es necesario

- La clave `anon` respeta RLS: cada usuario solo ve sus propios registros.
- Para estadísticas agregadas (NPS global, promedios de toda la cohorte), necesitas acceso cross-user.
- Una Edge Function corre en el servidor de Supabase, nunca expone la `service_role` key al cliente.

### Boilerplate de la Edge Function

Crea el archivo `supabase/functions/analytics/index.ts`:

```typescript
// supabase/functions/analytics/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Solo permite peticiones autenticadas (p. ej., desde el panel de facilitador)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Cliente con service_role: omite RLS, acceso total
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey
  )

  // Ejemplo: obtener NPS global sin restricción de RLS
  const { data, error } = await supabase
    .from('post_survey')
    .select('nps')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const total = data.length
  const promotores  = data.filter((r) => r.nps >= 9).length
  const detractores = data.filter((r) => r.nps <= 6).length
  const nps = total > 0
    ? Math.round(((promotores - detractores) / total) * 100)
    : null

  return new Response(
    JSON.stringify({ nps, promotores, detractores, total }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Desplegar la Edge Function

```bash
# Instala la CLI de Supabase si no la tienes
npm install -g supabase

# Inicia sesión y vincula el proyecto
supabase login
supabase link --project-ref <PROJECT_REF>

# Despliega la función
supabase functions deploy analytics
```

### Llamar a la función desde el frontend

```typescript
const { data } = await supabase.functions.invoke('analytics')
console.log(data.nps) // NPS global calculado en el servidor
```

---

## 5. Monitoreo básico

### Vercel Analytics

1. En el dashboard de Vercel, abre tu proyecto DecarboNation.
2. Ve a la pestaña **Analytics**.
3. Activa **Web Analytics** (gratuito para proyectos Hobby).
4. Verás métricas de visitas, usuarios únicos y rutas más visitadas.

Para eventos personalizados (p. ej., inicio de sesión de juego), agrega en el frontend:

```typescript
import { track } from '@vercel/analytics'
track('game_started', { nivel: currentLevel, resultado: 'en_progreso' })
```

### Supabase Logs

Revisa los logs periódicamente para detectar errores en las RPC o inserciones fallidas:

1. En Supabase Dashboard, ve a **Logs** en el menú lateral.
2. Filtra por **Database** para ver queries lentas o errores de constraint.
3. Filtra por **Edge Functions** si usas la función `analytics`.
4. Configura alertas en **Monitoring > Alerts** (plan Pro) para recibir emails si hay errores frecuentes.

### Checklist de revisión post-taller

- [ ] Verificar total de sesiones completadas (S1, query 1)
- [ ] Confirmar que pre_survey y post_survey tienen la misma cantidad de registros que game_sessions
- [ ] Revisar si hay sesiones con `duracion_segundos` nulo (posible fallo de cierre)
- [ ] Exportar `session_summary` como CSV y guardar en carpeta de archivos del taller
- [ ] Anotar el NPS del taller en el registro del proyecto

---

## Referencia rápida de tablas

| Tabla | Descripción |
|-------|-------------|
| `auth.users` | Usuarios autenticados (gestionado por Supabase Auth) |
| `public.profiles` | Perfil extendido: email, nombre, afiliación, rol |
| `public.game_sessions` | Registro de cada partida: nivel, duración, resultado |
| `public.annual_snapshots` | Estado del mundo por año simulado (KPIs + políticas activas) |
| `public.pre_survey` | Encuesta de entrada: perfil del jugador y expectativas |
| `public.post_survey` | Encuesta de salida: percepción, NPS, comentarios |
