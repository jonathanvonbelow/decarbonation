# Material de referencia del modelo 2.0

Prototipo de referencia del modelo 2.0 (Python, sin dependencias). No lo importa la app.
- python3 scripts/reference/modelo_v2.py            # tablas de caracterización
- python3 scripts/reference/modelo_v2.py --golden   # regenera golden_v2.csv
- npx tsx scripts/reference/export_situations.ts scripts/reference/situations.json   # para la parte de Territorio

| Archivo | Para qué |
|---|---|
| `modelo_v2.py` | Prototipo ejecutable de todas las ecuaciones del modelo 2.0 (Python 3.10+, sin dependencias). Fuente de los parámetros y de los resultados del paper técnico. |
| `golden_v2.csv` | Valores de referencia sin eventos (3 niveles × do_nothing/green/extractive × años 1, 10, 30). Los usa `tests/sim/golden.v2.spec.ts` desde la fase 46. |
| `finance44_cases.py` / `.json` | Casos de referencia de la fase 44 (`economy_step` y `pay()` del prototipo) para `tests/sim/finance.v2.spec.ts`. `python scripts/reference/finance44_cases.py > scripts/reference/finance44_cases.json` |
| `export_situations.ts` | Exporta el catálogo de situaciones de Territorio a `situations.json` (con `whenExpr`, la traducción de cada `when`), que el prototipo necesita para su parte de Territorio. `situations.json` está en `.gitignore`. |

```bash
python3 scripts/reference/modelo_v2.py --golden > scripts/reference/golden_v2.csv   # (--golden imprime por stdout)
```

En Windows el intérprete suele ser `python` en lugar de `python3`.

## Correcciones al prototipo (v6 / fase 32, 2026-10-22)

El paquete original traía cuatro errores que se corrigieron antes de usarlo como referencia
(detalle y cifras en `docs/DESIGN_DECISIONS_LOG.md`):

1. `declare()` cobraba el lote dos veces (`pay()` ya descuenta) y cobraba aunque no hubiera área de origen.
   Ahora busca el origen primero y cobra una sola vez.
2. La quiebra acumulaba `dt` en coma flotante (`24 × 1/12 = 1,9999…`) y se disparaba en el mes 25.
   Ahora la comparación tiene una tolerancia (`BREACH_EPS` = 1e-9 años) y quiebra en el mes 24, para cualquier `dt`.
3. Los efectos `landUseChange` de las situaciones y su condición `when` se ignoraban. Ahora los pares ± dentro
   de una opción son una transferencia directa origen→destino; los negativos sueltos van a barbecho (FAL) y los
   positivos sueltos salen de FAL, luego PRG, luego CC. `when` se evalúa al sortear la llegada (como
   `rollSituation`).
4. Los efectos sobre `Reservas_del_Tesoro` escalaban con √(Y/Y₀) también cuando eran negativos. Ahora solo
   escalan los ingresos positivos, con el mismo factor que los costos (`min(2,5, max(1, √(Y/Y₀)))`).

`golden_v2.csv` no cambió con estas correcciones (es de 3 niveles sin eventos, donde ninguna de ellas actúa).

Regla: si una fase cambia una ecuación o un parámetro, se actualiza este prototipo y se regenera el golden en el mismo commit.

Fase 46: el juego de 3 niveles integra cada año con 12 sub-pasos mensuales (`SUBSTEPS_PER_YEAR` en `play_level`; con un paso
de dt = 1 los impulsores se evaluaban una vez por año y anual y mensual diferían hasta 2,05 puntos en St). El calendario de
desbloqueo de pactos en `play_level` sale del número de paso (con t acumulado en floats, 2029,9999… < 2030). `golden_v2.csv`
regenerado (cambios de hasta 3 puntos al año 1, ≤ 0,5 al año 30).
