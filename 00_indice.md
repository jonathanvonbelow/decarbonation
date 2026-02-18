# DecarboNation 2.5 → 3.0: Instrucciones para Claude Code

## Índice de mejoras

Ejecutar en orden. Cada archivo `.md` contiene instrucciones completas y autosuficientes.

| # | Archivo | Archivos modificados | Prioridad |
|---|---------|----------------------|-----------|
| 01 | `01_chatbot_layout.md` | `ChatbotPanel.tsx`, `GameLogPanel.tsx`, `App.tsx` | 🔴 Alta |
| 02 | `02_decarbonito_brevedad.md` | `constants.ts` | 🔴 Alta |
| 03 | `03_piechart_decimales.md` | `Dashboard.tsx` | 🔴 Alta |
| 04 | `04_co2_inicial_realista.md` | `constants.ts` | 🟡 Media |
| 05 | `05_presion_agricola.md` | `constants.ts` | 🟡 Media |
| 06 | `06_nivel1_economia.md` | `constants.ts`, `App.tsx` | 🟡 Media |
| 07 | `07_deploy_vercel.md` | Infraestructura | 🟢 Deploy |

---

## Instrucción maestra para Claude Code

Al abrir cada `.md`, decirle a Claude Code:

> "Lee el archivo `XX_nombre.md` y aplica exactamente los cambios descritos. Después de cada
> cambio, ejecuta `npm run build` para verificar que no hay errores TypeScript antes de continuar
> con el siguiente archivo."

---

## APIs necesarias

### Gemini API Key (requerida para el chatbot)
- Obtener en: https://aistudio.google.com/app/apikey
- Configurar en: `.env.local` → `GEMINI_API_KEY=AIzaSy...`
- Configurar en Vercel: Settings → Environment Variables → `GEMINI_API_KEY`

### No se necesitan otras APIs
Esta app no usa Supabase, auth, ni servicios externos adicionales.

---

## Flujo recomendado

```
1. Aplicar mejoras 01-06 con Claude Code (en orden)
2. npm run build  ← sin errores
3. Crear repo GitHub + push
4. Conectar a Vercel + agregar GEMINI_API_KEY
5. Deploy automático
6. Probar en producción
```
