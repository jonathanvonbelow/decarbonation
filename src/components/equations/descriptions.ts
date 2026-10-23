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
    es: "Propiedades base para cada tipo de uso de suelo, incluyendo sus tasas de emisión y secuestro de carbono. El área en vivo muestra la distribución actual del territorio.",
    en: "Base properties for each land use type, including its carbon emission and sequestration rates. Live area shows the territory's current distribution.",
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
    es: "Fórmula genérica que muestra cómo se calculan los indicadores socio-ambientales como la Biodiversidad. Son una suma ponderada de los efectos de las políticas y los usos del suelo.",
    en: "The generic formula for how socio-environmental indicators like Biodiversity are calculated. They are a weighted sum of the effects of policies and land uses.",
  },
  EQUATION_TITLE_POLITICAL_PRESSURE: {
    es: "Modela cómo aumenta o disminuye el descontento de los grupos de interés: cada año la presión suma un impulso lineal (políticas e indicadores bajo su umbral) y pierde una fracción fija de sí misma (disipación), con límites 0 y 100.",
    en: "Models how discontent among interest groups rises or falls: each year the pressure adds a linear impulse (policies and indicators below their threshold) and loses a fixed share of itself (dissipation), bounded to 0 and 100.",
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
  Tasa_disipacion_presion_social: {
    es: "Fracción de la Presión Social que se disipa cada año (provisoria: las presiones pasan al modelo 2.0 en una fase posterior).",
    en: "Share of the Social Pressure that dissipates each year (provisional: the pressures move to model 2.0 in a later phase).",
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
  Tasa_de_interes_Nivel_1: {
    es: "Tasa de interés anual que se aplica sobre la deuda total en el Nivel 1.",
    en: "Annual interest rate applied to total debt in Level 1.",
  },
  Tasa_de_interes_Nivel_2: {
    es: "Tasa de interés anual que se aplica sobre la deuda total en el Nivel 2.",
    en: "Annual interest rate applied to total debt in Level 2.",
  },
  Tasa_de_interes_Nivel_3: {
    es: "Tasa de interés anual que se aplica sobre la deuda total en el Nivel 3.",
    en: "Annual interest rate applied to total debt in Level 3.",
  },
  Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso: {
    es: "Peso relativo del componente 'Políticas' en el cálculo del cambio anual de la Biodiversidad.",
    en: "Relative weight of the 'Policies' component in the annual Biodiversity change calculation.",
  },
  Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso: {
    es: "Peso relativo del componente 'Uso del Suelo' en el cálculo del cambio anual de la Biodiversidad.",
    en: "Relative weight of the 'Land Use' component in the annual Biodiversity change calculation.",
  },
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso: {
    es: "Peso relativo del componente 'Políticas' en el cálculo del cambio anual de la Seguridad Alimentaria.",
    en: "Relative weight of the 'Policies' component in the annual Food Security change calculation.",
  },
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso: {
    es: "Peso relativo del componente 'Uso del Suelo' en el cálculo del cambio anual de la Seguridad Alimentaria.",
    en: "Relative weight of the 'Land Use' component in the annual Food Security change calculation.",
  },
  Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso: {
    es: "Peso relativo del impacto directo de la Biodiversidad sobre la Seguridad Alimentaria.",
    en: "Relative weight of Biodiversity's direct impact on Food Security.",
  },
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso: {
    es: "Peso relativo del componente 'Políticas' en el cálculo del cambio anual de la Seguridad Económica.",
    en: "Relative weight of the 'Policies' component in the annual Economic Security change calculation.",
  },
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso: {
    es: "Peso relativo del componente 'Uso del Suelo' en el cálculo del cambio anual de la Seguridad Económica.",
    en: "Relative weight of the 'Land Use' component in the annual Economic Security change calculation.",
  },
  Impacto_Biodiversidad_en_SE_Peso: {
    es: "Peso relativo del impacto directo de la Biodiversidad sobre la Seguridad Económica.",
    en: "Relative weight of Biodiversity's direct impact on Economic Security.",
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
  Factor_Presion_Agricola_PAS: {
    es: "Impacto de la política Agroecológica sobre la presión del sector agrícola (positivo = aumenta la presión).",
    en: "Impact of the Agro-ecological policy on agricultural sector pressure (positive = increases pressure).",
  },
  Factor_Presion_Agricola_PGS: {
    es: "Impacto de la política de Ganadería Sostenible sobre la presión del sector agrícola (positivo = aumenta la presión).",
    en: "Impact of the Sustainable Livestock policy on agricultural sector pressure (positive = increases pressure).",
  },
  Factor_Presion_Agricola_PPAI: {
    es: "Impacto de la política de Agricultura Intensiva sobre la presión del sector agrícola (negativo = disminuye la presión).",
    en: "Impact of the Intensive Agriculture policy on agricultural sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Agricola_PPEA: {
    es: "Impacto de la política de Exportaciones Agrícolas sobre la presión del sector agrícola (negativo = disminuye la presión).",
    en: "Impact of the Agricultural Exports policy on agricultural sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PAS: {
    es: "Impacto de la política Agroecológica sobre la presión del sector ambientalista (negativo = disminuye la presión).",
    en: "Impact of the Agro-ecological policy on environmentalist sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PCR: {
    es: "Impacto de la política de Conservación sobre la presión del sector ambientalista (negativo = disminuye la presión).",
    en: "Impact of the Conservation policy on environmentalist sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PGS: {
    es: "Impacto de la política de Ganadería Sostenible sobre la presión del sector ambientalista (negativo = disminuye la presión).",
    en: "Impact of the Sustainable Livestock policy on environmentalist sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PAGUA: {
    es: "Impacto de la política de Gestión del Agua sobre la presión del sector ambientalista (negativo = disminuye la presión).",
    en: "Impact of the Water Management policy on environmentalist sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PCN: {
    es: "Impacto de la política de Neutralidad de Carbono sobre la presión del sector ambientalista (negativo = disminuye la presión).",
    en: "Impact of the Carbon Neutrality policy on environmentalist sector pressure (negative = decreases pressure).",
  },
  Factor_Presion_Ambiental_PPAI_Neg: {
    es: "Impacto de la política de Agricultura Intensiva sobre la presión del sector ambientalista (positivo = aumenta la presión).",
    en: "Impact of the Intensive Agriculture policy on environmentalist sector pressure (positive = increases pressure).",
  },
  Factor_Presion_Ambiental_PFRA_Neg: {
    es: "Impacto de la política de Normativas Flexibles sobre la presión del sector ambientalista (positivo = aumenta la presión).",
    en: "Impact of the Flexible Regulations policy on environmentalist sector pressure (positive = increases pressure).",
  },
  Factor_Presion_Ambiental_PSE_Neg: {
    es: "Impacto de la política de Subsidios Energéticos sobre la presión del sector ambientalista (positivo = aumenta la presión).",
    en: "Impact of the Energy Subsidies policy on environmentalist sector pressure (positive = increases pressure).",
  },
  Factor_Presion_Social_PAS: {
    es: "Impacto de la política Agroecológica sobre la presión social (negativo = disminuye la presión).",
    en: "Impact of the Agro-ecological policy on social pressure (negative = decreases pressure).",
  },
  Factor_Presion_Social_PAGUA: {
    es: "Impacto de la política de Gestión del Agua sobre la presión social (negativo = disminuye la presión).",
    en: "Impact of the Water Management policy on social pressure (negative = decreases pressure).",
  },
  Factor_Presion_Social_PCN: {
    es: "Impacto de la política de Neutralidad de Carbono sobre la presión social (negativo = disminuye la presión).",
    en: "Impact of the Carbon Neutrality policy on social pressure (negative = decreases pressure).",
  },
  Factor_Presion_Social_PCR: {
    es: "Impacto de la política de Conservación sobre la presión social (negativo = disminuye la presión).",
    en: "Impact of the Conservation policy on social pressure (negative = decreases pressure).",
  },
  Factor_Presion_Social_PPAI_Neg: {
    es: "Impacto de la política de Agricultura Intensiva sobre la presión social (positivo = aumenta la presión).",
    en: "Impact of the Intensive Agriculture policy on social pressure (positive = increases pressure).",
  },
  Factor_Presion_Social_PPIE_Neg: {
    es: "Impacto de la política de Inversión Extranjera sobre la presión social (positivo = aumenta la presión).",
    en: "Impact of the Foreign Investment policy on social pressure (positive = increases pressure).",
  },
  Factor_Presion_Social_PFRA_Neg: {
    es: "Impacto de la política de Normativas Flexibles sobre la presión social (positivo = aumenta la presión).",
    en: "Impact of the Flexible Regulations policy on social pressure (positive = increases pressure).",
  },
  Sensibilidad_PP_Agricola_SegEconomica: {
    es: "Factor que multiplica la diferencia entre el umbral y el valor real de la Seguridad Económica para generar presión agrícola.",
    en: "Factor multiplying the gap between the threshold and the actual Economic Security value to generate agricultural pressure.",
  },
  Umbral_PP_Agricola_SegEconomica: {
    es: "Valor de Seguridad Económica por debajo del cual el sector agrícola comienza a generar presión.",
    en: "Economic Security value below which the agricultural sector starts generating pressure.",
  },
  Sensibilidad_PP_Agricola_SegAlimentaria: {
    es: "Factor que multiplica la diferencia entre el umbral y el valor real de la Seguridad Alimentaria para generar presión agrícola.",
    en: "Factor multiplying the gap between the threshold and the actual Food Security value to generate agricultural pressure.",
  },
  Umbral_PP_Agricola_SegAlimentaria: {
    es: "Valor de Seguridad Alimentaria por debajo del cual el sector agrícola comienza a generar presión.",
    en: "Food Security value below which the agricultural sector starts generating pressure.",
  },
  Sensibilidad_PP_Ambiental_Biodiversidad: {
    es: "Factor que multiplica la diferencia entre el umbral y el valor real de la Biodiversidad para generar presión ambientalista.",
    en: "Factor multiplying the gap between the threshold and the actual Biodiversity value to generate environmentalist pressure.",
  },
  Umbral_PP_Ambiental_Biodiversidad: {
    es: "Valor de Biodiversidad por debajo del cual el sector ambientalista comienza a generar presión.",
    en: "Biodiversity value below which the environmentalist sector starts generating pressure.",
  },
  Sensibilidad_PP_Ambiental_BalanceCarbono: {
    es: "Factor que multiplica el déficit de carbono (si es negativo) para generar presión ambientalista.",
    en: "Factor multiplying the carbon deficit (if negative) to generate environmentalist pressure.",
  },
  EfectoPositivo_PP_Ambiental_BalanceCarbono: {
    es: "Pequeño efecto de reducción de presión si el balance de carbono es positivo.",
    en: "Small pressure-reducing effect when the carbon balance is positive.",
  },
  Sensibilidad_PP_Social_BienestarSocial: {
    es: "Factor que multiplica la diferencia entre el umbral y el valor real del Bienestar Social para generar presión social.",
    en: "Factor multiplying the gap between the threshold and the actual Social Wellbeing value to generate social pressure.",
  },
  Umbral_PP_Social_BienestarSocial: {
    es: "Valor de Bienestar Social por debajo del cual se comienza a generar presión social.",
    en: "Social Wellbeing value below which social pressure starts being generated.",
  },
  PRESION_PUNTO_EQUILIBRIO: {
    es: "El valor de presión (0-100) hacia el cual todos los grupos de presión tienden a normalizarse si no hay otros impulsos.",
    en: "The pressure value (0-100) toward which every pressure group tends to normalize absent other drivers.",
  },
  PRESION_TASA_NORMALIZACION: {
    es: "La velocidad (porcentaje por año) a la que la presión se mueve hacia el Punto de Equilibrio.",
    en: "The speed (percentage per year) at which pressure moves toward the Equilibrium Point.",
  },
  Max_Additional_Tax_Rate_Percentage: {
    es: "La tasa impositiva adicional máxima que el jugador puede aplicar en el Nivel 3.",
    en: "The maximum additional tax rate the player can apply in Level 3.",
  },
  PBIGrowth_Reduction_Factor_Per_Tax_Point: {
    es: "Reducción en la tasa de crecimiento del PBI por cada punto porcentual de impuesto adicional aplicado.",
    en: "Reduction in GDP growth rate per percentage point of additional tax applied.",
  },
  PPSocial_Increase_Factor_Per_Tax_Point: {
    es: "Puntos de aumento en la Presión Social por cada punto porcentual de impuesto adicional aplicado.",
    en: "Points of Social Pressure increase per percentage point of additional tax applied.",
  },
};
