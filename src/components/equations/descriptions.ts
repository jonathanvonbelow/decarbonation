import type { Language } from '../../hooks/useLanguage';

// Phase 12 (12_i18n_completo.md §4.3, Capa B): was `Record<string, string>`, Spanish-only, since
// this file's creation — the one genuinely untranslated file among the 9 tracked in
// scripts/i18n-audit.mjs's CAPA_B_C_PENDING (the other three, geminiService.ts/
// decarbonitoAgent.ts/suggestionService.ts, turned out to already be fully bilingual on
// inspection; see docs/DESIGN_DECISIONS_LOG.md, phase 12 entry). Consumed by
// EquationsManual.tsx's tooltips, which already reads `language` for its own UI chrome but was
// passing that same key straight into a flat Spanish dict. Re-keyed to
// `Record<string, Record<Language, string>>`; EquationsManual.tsx's lookup updated to
// `DESCRIPTIONS[item.key]?.[language]`.
export const DESCRIPTIONS: Record<string, Record<Language, string>> = {
  // Titles
  TITLE_CONTROL_PARAMS: {
    es: "Parámetros globales que ajustan la sensibilidad y las constantes de la simulación. Modificarlos cambia drásticamente el comportamiento del juego.",
    en: "Global parameters that tune the simulation's sensitivity and constants. Changing them drastically alters the game's behavior.",
  },
  TITLE_POLICIES: {
    es: "Definiciones base para cada política, incluyendo sus costos y dinámicas de eficiencia a lo largo del tiempo. Los valores en vivo reflejan el estado actual de la partida.",
    en: "Base definitions for each policy, including their costs and efficiency dynamics over time. Live values reflect the current state of the session.",
  },
  TITLE_LAND_USE: {
    es: "Propiedades base para cada tipo de uso de suelo, incluyendo su flujo anual de carbono (tCO₂e/ha) y su stock (Mg C/ha). El área en vivo muestra la distribución actual del territorio.",
    en: "Base properties for each land use type, including its annual carbon flux (tCO₂e/ha) and its stock (Mg C/ha). Live area shows the territory's current distribution.",
  },
  TITLE_EQUATIONS: {
    es: "Las fórmulas matemáticas fundamentales que impulsan la simulación. Muestran cómo se interrelacionan las variables para producir los resultados anuales.",
    en: "The fundamental mathematical formulas that drive the simulation. They show how variables interrelate to produce each year's results.",
  },

  // Control Params Table Headers
  PARAM_TABLE_HEADER_KEY: {
    es: "El nombre único del parámetro en el código fuente de la simulación.",
    en: "The parameter's unique name in the simulation's source code.",
  },
  PARAM_TABLE_HEADER_VALUE: {
    es: "El valor numérico o de texto asignado al parámetro para la simulación actual.",
    en: "The numeric or text value assigned to the parameter for the current simulation.",
  },

  // Policy Table Headers
  POLICY_TABLE_HEADER_NAME: {
    es: "El nombre de la política tal como se muestra en la interfaz.",
    en: "The policy's name as shown in the interface.",
  },
  POLICY_TABLE_HEADER_COST: {
    es: "Costo anual de la política con esfuerzo pleno, como porcentaje del PBI. El 30 % se paga siempre; el resto, según el esfuerzo asignado a sus instrumentos.",
    en: "The policy's annual cost at full effort, as a percentage of GDP. 30% is always paid; the rest scales with the effort assigned to its instruments.",
  },
  POLICY_TABLE_HEADER_DECAY: {
    es: "Puesta en marcha (λ): años hasta alcanzar el 63 % del efecto tras activarla. Desgaste (δ): años de uso tras los que perdió el 63 % de su empuje por encima del piso institucional; descansar lo recupera.",
    en: "Start-up (λ): years to reach 63% of the effect after activation. Wear (δ): years of use after which it has lost 63% of its push above the institutional floor; resting recovers it.",
  },
  POLICY_TABLE_HEADER_EFFICIENCY_LIVE: {
    es: "La eficiencia base actual de la política (0-100%): puesta en marcha por desgaste. El reparto del esfuerzo entre instrumentos la escala por canal.",
    en: "The policy's current base efficiency (0-100%): start-up times wear. The split of effort across instruments scales it per channel.",
  },
  POLICY_TABLE_HEADER_EFFORT_LIVE: {
    es: "El esfuerzo total (0-100%) asignado a los instrumentos de esta política (parejo en el Nivel 1). Con rendimientos decrecientes por instrumento, escala el efecto de cada canal y el costo.",
    en: "The total effort (0-100%) assigned to this policy's instruments (even on Level 1). With diminishing returns per instrument, it scales each channel's effect and the cost.",
  },

  // Land Use Table Headers
  LAND_USE_TABLE_HEADER_NAME: {
    es: "El nombre del tipo de uso del suelo.",
    en: "The land use type's name.",
  },
  LAND_USE_TABLE_HEADER_EMISSION: {
    es: "Flujo anual de carbono del suelo (en tCO₂e por hectárea; positivo = emite, negativo = captura) para este uso.",
    en: "Annual land carbon flux (in tCO₂e per hectare; positive = emits, negative = captures) for this land use.",
  },
  LAND_USE_TABLE_HEADER_SEQUESTRATION: {
    es: "Carbono almacenado (en Mg C por hectárea, biomasa y suelo). Convertir un uso en otro de menor stock emite la diferencia × 44/12.",
    en: "Stored carbon (in Mg C per hectare, biomass and soil). Converting a use into one with a lower stock emits the difference × 44/12.",
  },
  LAND_USE_TABLE_HEADER_AREA_LIVE: {
    es: "La superficie actual (en miles de hectáreas - kHa) que ocupa este tipo de uso del suelo en la nación.",
    en: "The current area (in thousands of hectares - kHa) this land use type occupies in the nation.",
  },

  // Equation Section Titles
  EQUATION_TITLE_POLICY_EFFICIENCY: {
    es: "La fórmula que determina cuán efectiva es una política: arranca de a poco (puesta en marcha), se desgasta con el uso hacia un piso y se recupera en reposo; el esfuerzo en sus instrumentos la escala por canal.",
    en: "The formula that determines how effective a policy is: it starts slowly (start-up), wears with use towards a floor and recovers while resting; the effort on its instruments scales it per channel.",
  },
  EQUATION_TITLE_CARBON_BALANCE: {
    es: "La ecuación central para el cambio climático: un inventario anual en toneladas de CO₂ equivalente con tres componentes (energía, flujo del suelo y cambio de uso), dividido por la población.",
    en: "The central equation for climate change: a yearly inventory in tonnes of CO₂ equivalent with three components (energy, land flux and land-use change), divided by the population.",
  },
  EQUATION_TITLE_INDICATORS: {
    es: "Cómo se calculan la Biodiversidad (hábitat efectivo, relación especies-área, calidad de manejo y, en Territorio, conectividad del bosque) y la Seguridad Alimentaria (alimentos disponibles por persona frente al inicio y acceso por ingreso): cada una se acerca cada año a su objetivo.",
    en: "How Biodiversity (effective habitat, species-area relation, management quality and, in Territorio, forest connectivity) and Food Security (food available per person against the start, and access by income) are calculated: each moves toward its target every year.",
  },
  EQUATION_TITLE_POLITICAL_PRESSURE: {
    es: "Modela el descontento de los grupos de interés: cada presión se acerca cada año a un objetivo en S anclado al inicio del nivel, que mueven las políticas y los desvíos de los indicadores (y, la agrícola, el tamaño del sector productivo).",
    en: "Models discontent among interest groups: each pressure moves every year toward an S-shaped target anchored at the level start, moved by the policies and by how far the indicators drifted (and, for the agricultural one, by the size of the productive sector).",
  },
  EQUATION_TITLE_ECONOMY: {
    es: "Fórmulas que gobiernan la macroeconomía de la nación, incluyendo el crecimiento del PBI y el balance de las finanzas públicas.",
    en: "Formulas governing the nation's macroeconomy, including GDP growth and the balance of public finances.",
  },
  EQUATION_TITLE_STABILITY_CONFLICT: {
    es: "Ecuaciones que determinan la cohesión social y la estabilidad del gobierno. Son cruciales para evitar condiciones de fin de juego.",
    en: "Equations determining social cohesion and government stability. They're crucial for avoiding game-over conditions.",
  },
  EQUATION_TITLE_SCORE: {
    es: "La fórmula que calcula el Puntaje General. Los componentes y sus pesos cambian en cada nivel para reflejar los desafíos de esa etapa.",
    en: "The formula that calculates the General Score. Its components and their weights change each level to reflect that stage's challenges.",
  },

  // CONTROL_PARAMS descriptions
  Ano_Activacion_Prestamo: {
    es: "El primer año del juego en que la opción de solicitar préstamos se vuelve disponible para el jugador (generalmente en Nivel 3).",
    en: "The first game year in which the option to request loans becomes available to the player (usually in Level 3).",
  },
  Tasa_Impositiva_General_Sobre_PBI: {
    es: "La tasa impositiva base que se aplica sobre el PBI para calcular los ingresos del gobierno.",
    en: "The base tax rate applied to GDP to calculate government revenue.",
  },
  Tasa_Base_Crecimiento_PBI: {
    es: "La tasa de crecimiento anual 'natural' del PBI, antes de ser modificada por los efectos de las políticas.",
    en: "The 'natural' annual GDP growth rate, before being modified by policy effects.",
  },
  Pago_deuda_anual_Nivel_1: {
    es: "Porcentaje del capital de la deuda total que se paga anualmente en el Nivel 1.",
    en: "Percentage of total debt principal paid annually in Level 1.",
  },
  Pago_deuda_anual_Nivel_2: {
    es: "Porcentaje del capital de la deuda total que se paga anualmente en el Nivel 2.",
    en: "Percentage of total debt principal paid annually in Level 2.",
  },
  Pago_deuda_anual_Nivel_3: {
    es: "Porcentaje del capital de la deuda total que se paga anualmente en el Nivel 3.",
    en: "Percentage of total debt principal paid annually in Level 3.",
  },
  Velocidad_Ajuste_Biodiversidad: {
    es: "Fracción anual del camino que la Biodiversidad recorre hacia su objetivo (0,12: unos 8 años de constante de tiempo; el hábitat responde lento, deuda de extinción).",
    en: "Annual share of the way Biodiversity moves toward its target (0.12: a time constant of about 8 years; habitat responds slowly, extinction debt).",
  },
  Velocidad_Ajuste_Seg_Alimentaria: {
    es: "Fracción anual del camino que la Seguridad Alimentaria recorre hacia su objetivo (0,35: los mercados de alimentos se ajustan en pocos años).",
    en: "Annual share of the way Food Security moves toward its target (0.35: food markets adjust within a few years).",
  },
  Velocidad_Ajuste_Seg_Economica: {
    es: "Fracción anual del camino que la Seguridad Económica recorre hacia su objetivo (0,30: tarda unos 3 años en recorrer dos tercios).",
    en: "Annual share of the way Economic Security moves toward its target (0.30: about 3 years to cover two thirds).",
  },
  Velocidad_Ajuste_Conflicto: {
    es: "Fracción anual del camino que el Conflicto Social (100 − Bienestar) recorre hacia su objetivo.",
    en: "Annual share of the way Social Conflict (100 − Wellbeing) moves toward its target.",
  },
  Velocidad_Ajuste_Colapso: {
    es: "Fracción anual del camino que el Colapso Político (100 − Estabilidad) recorre hacia su objetivo.",
    en: "Annual share of the way Political Collapse (100 − Stability) moves toward its target.",
  },
  Velocidad_Ajuste_Presiones: {
    es: "Fracción anual del camino que las tres presiones sectoriales (agrícola, ambientalista, social) recorren hacia su objetivo en S (0,35: unos 3 años para dos tercios).",
    en: "Annual share of the way the three sectoral pressures (agricultural, environmentalist, social) move toward their S-shaped target (0.35: about 3 years for two thirds).",
  },
  Tasa_de_interes_Nivel_1: {
    es: "Tasa de interés anual base sobre la deuda total en el Nivel 1. Desde la fase 44 se le suma una prima de riesgo de 0,05 por cada punto de deuda/PBI por encima de 0,6.",
    en: "Base annual interest rate on total debt in Level 1. Since phase 44 a risk premium of 0.05 per point of debt/GDP above 0.6 is added.",
  },
  Tasa_de_interes_Nivel_2: {
    es: "Tasa de interés anual que se aplica sobre la deuda total en el Nivel 2.",
    en: "Annual interest rate applied to total debt in Level 2.",
  },
  Tasa_de_interes_Nivel_3: {
    es: "Tasa de interés anual que se aplica sobre la deuda total en el Nivel 3.",
    en: "Annual interest rate applied to total debt in Level 3.",
  },
  // Phase 50: model 2.0 scalars exposed in the facilitator panel.
  Poblacion_Inicial: {
    es: "Población del territorio al empezar cada nivel y Territorio (habitantes). Divide las emisiones (CO₂ por habitante) y la oferta de alimentos. Se aplica al empezar o reiniciar un nivel.",
    en: "Population of the territory at the start of each level and of Territorio (inhabitants). It divides emissions (CO₂ per inhabitant) and food supply. It applies when a level starts or restarts.",
  },
  Tasa_Crecimiento_Poblacional_Base: {
    es: "Crecimiento anual de la población (fracción por año), compuesto: P ← P·(1 + g)^dt.",
    en: "Annual population growth (fraction per year), compounded: P ← P·(1 + g)^dt.",
  },
  Eficiencia_Minima_Politicas: {
    es: "Piso institucional de la eficiencia de una política desgastada (0-1): por mucho que se use, nunca rinde menos que esta fracción de su efecto pleno.",
    en: "Institutional floor of a worn policy's efficiency (0-1): however long it is used, it never yields less than this fraction of its full effect.",
  },
  Recuperacion_Politicas_Anios: {
    es: "Constante de tiempo (años) con la que una política desactivada recupera su empuje: el desgaste acumulado baja como e^(−t/ρ).",
    en: "Time constant (years) with which a deactivated policy recovers its push: the accumulated wear decays as e^(−t/ρ).",
  },
  Gasto_Publico_Base_Nivel_1: {
    es: "Gasto público base del Nivel 1, fracción del PBI por año: salud, educación, administración. Con 0,15 de recaudación base, 0,13 deja 2 % del PBI de superávit primario antes de pagar políticas. Es el parámetro más sensible del modelo: +20 % le quita a la cartera verde unos 14 puntos de Seguridad Económica en el Nivel 2.",
    en: "Base public spending of Level 1, fraction of GDP per year: health, education, administration. With 0.15 base revenue, 0.13 leaves 2 % of GDP of primary surplus before paying for policies. The model's most sensitive parameter: +20 % takes about 14 points of Economic Security from the green portfolio in Level 2.",
  },
  Gasto_Publico_Base_Nivel_2: {
    es: "Gasto público base del Nivel 2 (o de Territorio, que corre con el Nivel 2), fracción del PBI por año: salud, educación, administración. Con 0,15 de recaudación base, 0,125 deja 2,5 % del PBI de superávit primario antes de pagar políticas. Es el parámetro más sensible del modelo: +20 % le quita a la cartera verde unos 14 puntos de Seguridad Económica en el Nivel 2.",
    en: "Base public spending of Level 2 (or of Territorio, which runs on Level 2), fraction of GDP per year: health, education, administration. With 0.15 base revenue, 0.125 leaves 2.5 % of GDP of primary surplus before paying for policies. The model's most sensitive parameter: +20 % takes about 14 points of Economic Security from the green portfolio in Level 2.",
  },
  Gasto_Publico_Base_Nivel_3: {
    es: "Gasto público base del Nivel 3, fracción del PBI por año: salud, educación, administración. Con 0,15 de recaudación base, 0,125 deja 2,5 % del PBI de superávit primario antes de pagar políticas. Es el parámetro más sensible del modelo: +20 % le quita a la cartera verde unos 14 puntos de Seguridad Económica en el Nivel 2.",
    en: "Base public spending of Level 3, fraction of GDP per year: health, education, administration. With 0.15 base revenue, 0.125 leaves 2.5 % of GDP of primary surplus before paying for policies. The model's most sensitive parameter: +20 % takes about 14 points of Economic Security from the green portfolio in Level 2.",
  },
  Tasa_de_BNNP_a_BNP_Base: {
    es: "Tasa de conversión anual base de Bosque Nativo No Protegido a Bosque Nativo Protegido.",
    en: "Base annual conversion rate from Unprotected Native Forest to Protected Native Forest.",
  },
  Tasa_de_BNNP_a_CA_Base: {
    es: "Tasa de conversión anual base de Bosque Nativo No Protegido a Cultivos Agroecológicos.",
    en: "Base annual conversion rate from Unprotected Native Forest to Agro-ecological Crops.",
  },
  Tasa_de_BNNP_a_CC_Base: {
    es: "Tasa de conversión anual base de Bosque Nativo No Protegido a Cultivos Convencionales.",
    en: "Base annual conversion rate from Unprotected Native Forest to Conventional Crops.",
  },
  Tasa_de_CA_a_BNNP_Base: {
    es: "Tasa de conversión anual base (reforestación) de Cultivos Agroecológicos a Bosque Nativo No Protegido.",
    en: "Base annual conversion rate (reforestation) from Agro-ecological Crops to Unprotected Native Forest.",
  },
  Max_Additional_Tax_Rate_Percentage: {
    es: "La tasa impositiva adicional máxima que el jugador puede aplicar en el Nivel 3.",
    en: "The maximum additional tax rate the player can apply in Level 3.",
  },
};
