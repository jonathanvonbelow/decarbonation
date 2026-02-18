# Mejora 03 — Fix pie chart (Distribución de Uso del Suelo) + decimales en tendencias

## Contexto
Dos problemas de legibilidad reportados:
1. El gráfico de torta "Distribución de Uso del Suelo" tiene texto ilegible (labels superpuestos).
2. Los indicadores de tendencias históricas muestran demasiados decimales (ej: `42.3847291`).

---

## Problema 1: Pie chart con labels ilegibles

### Archivo: `components/Dashboard.tsx`

Buscar el componente `PieChart` / `Cell` de Recharts que renderiza la distribución de uso del suelo.
Buscar algo como:

```tsx
<PieChart>
  <Pie data={...} dataKey="area" nameKey="name" ...>
```

### Cambio requerido

Reemplazar el bloque del `<Pie>` para usar una leyenda externa en lugar de labels inline.
El objetivo es eliminar el `label` prop dentro del `<Pie>` y agregar un `<Legend>` separado:

```tsx
// ANTES (buscar alguna variante de esto):
<Pie
  data={landUseData}
  dataKey="area"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={80}
  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
>

// DESPUÉS — eliminar el prop `label` y agregar Legend externo:
<Pie
  data={landUseData}
  dataKey="area"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={80}
  label={false}
>
```

Y luego, dentro del mismo `<PieChart>`, agregar (si no existe ya un `<Legend>`):
```tsx
<Legend
  layout="vertical"
  align="right"
  verticalAlign="middle"
  formatter={(value, entry: any) => (
    <span className="text-xs text-gray-300">
      {value}: {entry.payload?.percent !== undefined
        ? `${(entry.payload.percent * 100).toFixed(1)}%`
        : ''}
    </span>
  )}
/>
<Tooltip
  formatter={(value: number, name: string) => [`${value.toFixed(1)} kHa`, name]}
  contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', fontSize: '12px' }}
/>
```

> **Nota:** Si el gráfico ya tiene `<Legend>` o `<Tooltip>`, NO agregar duplicados.
> Solo asegurarse de que `label={false}` está en el `<Pie>` y que el `<Legend>` usa `layout="vertical"`.

---

## Problema 2: Demasiados decimales en tendencias históricas

### Archivo: `components/Dashboard.tsx`

Buscar donde se renderizan los valores históricos en los gráficos de línea (`<LineChart>`).
El fix es en el `<Tooltip>` de cada LineChart:

**Buscar** el `formatter` de los tooltips en los LineChart (o agregarlo si no existe):

```tsx
// Agregar o modificar el Tooltip en cada LineChart de tendencias:
<Tooltip
  formatter={(value: number) => [
    typeof value === 'number' ? value.toFixed(1) : value
  ]}
  contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
/>
```

> Aplicar este cambio a TODOS los `<LineChart>` que muestren tendencias históricas en el Dashboard.
> El `.toFixed(1)` limita a 1 decimal, que es suficiente para los indicadores del juego.

---

## Verificación
1. `npm run dev`
2. En el Dashboard, el gráfico de torta de uso del suelo debe mostrar una leyenda lateral legible
   en lugar de labels superpuestos sobre las porciones.
3. Al pasar el cursor sobre puntos en los gráficos de tendencia, los valores deben mostrar 1 decimal
   (ej: `42.3` en lugar de `42.3847291`).
4. `npm run build` — sin errores TypeScript.
