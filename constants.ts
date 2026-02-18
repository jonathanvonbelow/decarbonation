

import { Policy, PolicyState, LandUseType, LandUse, GameState, LevelConfig, StellaStocks, Pact, PolicyInstrument, RandomEvent, RandomEventEffect, RegionalZoneData, ControlParams, InitialIndicatorOverrides, InstrumentImpactHints } from './types';

export const INITIAL_YEAR = 2024;
export const SIMULATION_YEARS_PER_ROUND = 1;
export const YEARS_PER_LEVEL = 30;
export const MAX_LEVELS = 3;
export const POLICY_LOCK_IN_DURATION = 5; // Años que una política debe permanecer activa
export const MAX_ACTIVE_POLICIES = 5; // Máximo de políticas activas simultáneamente


export const API_KEY_ERROR_MESSAGE = "La variable de entorno API_KEY no está configurada. La funcionalidad del chatbot estará desactivada.";
// FIX: Updated model to recommended 'gemini-2.5-flash' from deprecated 'gemini-1.5-flash'.
export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';

export const ALL_POLICIES: Policy[] = Object.values(Policy);

// --- DEFINICIONES DE INSTRUMENTOS DE POLÍTICA ---
const DEFAULT_INSTRUMENT_EFFECTIVENESS = 0.25; // Efectividad base por defecto para un instrumento

export const INITIAL_POLICY_INSTRUMENTS: Record<Policy, Record<string, PolicyInstrument>> = {
  [Policy.Agroecological]: {
    "AS_Subsidios_Bioinsumos": { id: "AS_Subsidios_Bioinsumos", name: "Subsidios para Bioinsumos", description: "Fomentar el uso de compostaje, biofertilizantes y biopesticidas mediante apoyo económico directo a productores.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AS_Capacitacion_Tecnicas": { id: "AS_Capacitacion_Tecnicas", name: "Capacitación en Técnicas Agroecológicas", description: "Desarrollar programas de formación en rotación de cultivos, siembra directa, manejo integrado de plagas y conservación de suelos.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AS_Corredores_Biologicos": { id: "AS_Corredores_Biologicos", name: "Creación de Corredores Biológicos", description: "Incentivar la creación y mantenimiento de corredores biológicos y zonas de refugio para biodiversidad en fincas agroecológicas.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AS_Certificacion_Marketing": { id: "AS_Certificacion_Marketing", name: "Certificación y Marketing Agroecológico", description: "Apoyar sistemas de certificación participativa y campañas de marketing para productos agroecológicos, mejorando su acceso a mercados.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.NaturalConservation]: {
    "CR_Expansion_Areas_Protegidas": { id: "CR_Expansion_Areas_Protegidas", name: "Expansión de Áreas Protegidas", description: "Designar y expandir legalmente áreas protegidas (parques nacionales, reservas naturales) y asegurar su gestión efectiva.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "CR_PSA_Bosques": { id: "CR_PSA_Bosques", name: "Pago por Servicios Ambientales (PSA) a Bosques", description: "Compensar a propietarios privados por conservar bosques nativos y otros ecosistemas valiosos en sus tierras.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "CR_Control_Especies_Invasoras": { id: "CR_Control_Especies_Invasoras", name: "Control de Especies Invasoras", description: "Implementar programas para la erradicación y control de especies exóticas invasoras y restaurar ecosistemas degradados.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "CR_Fortalecimiento_Guardaparques": { id: "CR_Fortalecimiento_Guardaparques", name: "Fortalecimiento de Guardaparques", description: "Aumentar personal, equipamiento, capacitación y tecnología para la vigilancia y control efectivo de áreas naturales.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.SustainableLivestock]: {
    "GS_Sistemas_Silvopastoriles": { id: "GS_Sistemas_Silvopastoriles", name: "Promoción de Sistemas Silvopastoriles", description: "Incentivar la integración de árboles y arbustos en sistemas ganaderos para mejorar el bienestar animal, la biodiversidad y el secuestro de carbono.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "GS_Manejo_Pasturas_Nativas": { id: "GS_Manejo_Pasturas_Nativas", name: "Manejo Sostenible de Pasturas", description: "Fomentar el manejo adecuado de pasturas nativas y cultivadas, incluyendo rotación de potreros y ajuste de carga animal.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "GS_Bancos_Forraje_Sequia": { id: "GS_Bancos_Forraje_Sequia", name: "Bancos de Forraje y Adaptación a Sequías", description: "Apoyar el establecimiento de bancos de forraje y estrategias de adaptación de la ganadería a eventos climáticos extremos como sequías.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "GS_Genetica_Eficiente_Bajas_Emisiones": { id: "GS_Genetica_Eficiente_Bajas_Emisiones", name: "Mejora Genética y Dietas Eficientes", description: "Invertir en investigación y adopción de razas bovinas más eficientes y dietas que reduzcan las emisiones de metano entérico.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.SustainableWaterManagement]: {
    "AGUA_Riego_Tecnificado_Eficiente": { id: "AGUA_Riego_Tecnificado_Eficiente", name: "Subsidios para Riego Tecnificado y Eficiente", description: "Proveer asistencia financiera y técnica para la adopción de sistemas de riego eficientes (goteo, microaspersión).", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AGUA_Proteccion_Fuentes_Recarga": { id: "AGUA_Proteccion_Fuentes_Recarga", name: "Protección de Fuentes Hídricas y Zonas de Recarga", description: "Implementar programas de conservación y restauración de cuencas hidrográficas, cabeceras de cuenca y zonas de recarga acuífera.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AGUA_Cosecha_Almacenamiento_Lluvia": { id: "AGUA_Cosecha_Almacenamiento_Lluvia", name: "Cosecha y Almacenamiento de Agua de Lluvia", description: "Incentivar la construcción de sistemas de recolección y almacenamiento de agua de lluvia a nivel predial y comunitario.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "AGUA_Tratamiento_Reuso_Aguas_Servidas": { id: "AGUA_Tratamiento_Reuso_Aguas_Servidas", name: "Tratamiento y Reúso de Aguas Servidas", description: "Invertir en infraestructura para el tratamiento de aguas residuales urbanas e industriales y promover su reúso seguro en agricultura.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.CarbonNeutrality]: {
    "C_Impuesto_Carbono_Sectorial": { id: "C_Impuesto_Carbono_Sectorial", name: "Impuesto al Carbono Progresivo y Sectorial", description: "Implementar un impuesto a las emisiones de carbono en sectores clave, con reinversión de lo recaudado en proyectos de mitigación.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "C_Fomento_Energias_Renovables_No_Convencionales": { id: "C_Fomento_Energias_Renovables_No_Convencionales", name: "Fomento a Energías Renovables No Convencionales", description: "Establecer subsidios, licitaciones y marcos regulatorios para acelerar la adopción de energía solar, eólica y otras renovables.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "C_Eficiencia_Energetica_Industrial_Residencial": { id: "C_Eficiencia_Energetica_Industrial_Residencial", name: "Programas de Eficiencia Energética Industrial y Residencial", description: "Lanzar programas de reconversión tecnológica y buenas prácticas para la eficiencia energética en industrias, comercios y hogares.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "C_Investigacion_Desarrollo_Captura_Carbono": { id: "C_Investigacion_Desarrollo_Captura_Carbono", name: "I+D en Captura y Almacenamiento de Carbono (CAC)", description: "Financiar la investigación, desarrollo y proyectos piloto de tecnologías de captura, almacenamiento y uso de carbono (CAC/CCUS).", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.IntensiveAgriculture]: {
    "PAI_Subsidios_Fertilizantes_Quimicos_Pesticidas": { id: "PAI_Subsidios_Fertilizantes_Quimicos_Pesticidas", name: "Subsidios a Fertilizantes Químicos y Pesticidas", description: "Otorgar subsidios para la adquisición de fertilizantes sintéticos y pesticidas de alta eficacia para maximizar rendimientos.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PAI_Infraestructura_Logistica_Agroindustrial": { id: "PAI_Infraestructura_Logistica_Agroindustrial", name: "Inversión en Infraestructura y Logística Agroindustrial", description: "Desarrollar infraestructura clave como silos, cadenas de frío, y mejorar rutas para la producción y transporte eficiente de commodities.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PAI_Creditos_Blandos_Maquinaria_Agricola": { id: "PAI_Creditos_Blandos_Maquinaria_Agricola", name: "Créditos Blandos para Maquinaria Agrícola Avanzada", description: "Facilitar créditos con tasas preferenciales para la compra de maquinaria agrícola moderna y de alta capacidad.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PAI_Desarrollo_Variedades_Alto_Rendimento_Transgenicos": { id: "PAI_Desarrollo_Variedades_Alto_Rendimento_Transgenicos", name: "I+D en Cultivos de Alto Rendimiento (Incl. Transgénicos)", description: "Invertir en investigación y desarrollo de variedades de cultivos genéticamente modificados o híbridos de alto rendimiento.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.AgriculturalExports]: {
    "PEA_Acuerdos_Comerciales_Apertura_Mercados": { id: "PEA_Acuerdos_Comerciales_Apertura_Mercados", name: "Acuerdos Comerciales y Apertura de Nuevos Mercados", description: "Negociar activamente acuerdos comerciales bilaterales y multilaterales para facilitar el acceso de productos agrícolas a mercados internacionales.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PEA_Subsidios_Logistica_Exportacion": { id: "PEA_Subsidios_Logistica_Exportacion", name: "Subsidios a la Logística de Exportación Agrícola", description: "Reducir costos de exportación mediante subsidios al transporte terrestre, fletes marítimos y taxas portuarias para productos agrícolas.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PEA_Promocion_Marca_Pais_Productos_Agricolas": { id: "PEA_Promocion_Marca_Pais_Productos_Agricolas", name: "Promoción 'Marca País' para Productos Agrícolas", description: "Invertir en campañas de marketing internacional y participación en ferias para posicionar los productos agrícolas nacionales.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PEA_Flexibilizacion_Normas_Calidad_Exportacion": { id: "PEA_Flexibilizacion_Normas_Calidad_Exportacion", name: "Flexibilización de Normas de Calidad para Exportación", description: "Adaptar o flexibilizar selectivamente normas de calidad internas para cumplir requisitos menos exigentes de ciertos mercados de exportación.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.ForeignInvestment]: {
    "PIE_Incentivos_Fiscales_Zonas_Francas": { id: "PIE_Incentivos_Fiscales_Zonas_Francas", name: "Creación de Zonas Francas e Incentivos Fiscales", description: "Crear zonas francas com exenciones impositivas y arancelarias significativas para atraer inversión extranjera directa en sectores clave.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PIE_Simplificacion_Tramites_Apertura_Empresas_Extranjeras": { id: "PIE_Simplificacion_Tramites_Apertura_Empresas_Extranjeras", name: "Simplificación de Trámites para Empresas Extranjeras", description: "Reducir la burocracia y los tiempos para la constitución y operación de empresas con capital extranjero.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PIE_Garantias_Proteccion_Inversiones_Extranjeras": { id: "PIE_Garantias_Proteccion_Inversiones_Extranjeras", name: "Garantías y Protección a Inversiones Extranjeras", description: "Establecer marcos legais robustos que ofrezcan seguridad jurídica, protección contra expropiaciones y mecanismos de arbitraje para inversores extranjeros.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "PIE_Promocion_Sectores_Estrategicos_Roadshows_Internacionales": { id: "PIE_Promocion_Sectores_Estrategicos_Roadshows_Internacionales", name: "Promoción de Sectores Estratégicos y Roadshows Internacionales", description: "Realizar misiones comerciales y roadshows internacionales para promocionar activamente oportunidades de inversión en sectores estratégicos del país.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.FlexibleEnvironmentalRegulations]: {
    "FRA_Reduccion_Tiempos_Evaluacion_Impacto_Ambiental": { id: "FRA_Reduccion_Tiempos_Evaluacion_Impacto_Ambiental", name: "Reducción de Tiempos para Evaluación de Impacto Ambiental (EIA)", description: "Acortar plazos y simplificar requisitos para las Evaluaciones de Impacto Ambiental (EIA) de nuevos proyectos.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "FRA_Moratorias_Sanciones_Incumplimiento_Ambiental": { id: "FRA_Moratorias_Sanciones_Incumplimiento_Ambiental", name: "Moratorias o Reducción de Sanciones por Incumplimiento Ambiental", description: "Establecer períodos de gracia, amnistías o reducción en multas y sanciones por incumplimientos de normativas ambientales.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "FRA_Permisos_Rapidos_Uso_Recursos_Naturales": { id: "FRA_Permisos_Rapidos_Uso_Recursos_Naturales", name: "Agilización de Permisos para Uso de Recursos Naturales", description: "Acelerar la concesión de permisos para el aprovechamiento de recursos naturales (agua, suelo, forestal, minero) con menos trabas.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "FRA_Consulta_Publica_Ambiental_No_Vinculante": { id: "FRA_Consulta_Publica_Ambiental_No_Vinculante", name: "Consulta Pública Ambiental con Carácter No Vinculante", description: "Modificar el carácter de las consultas públicas en procesos de licenciamiento ambiental para que sus resultados no sean vinculantes.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
  [Policy.EnergySubsidies]: {
    "SE_Subsidios_Directos_Combustibles_Fosiles_Transporte": { id: "SE_Subsidios_Directos_Combustibles_Fosiles_Transporte", name: "Subsidios Directos a Combustibles Fósiles para Transporte", description: "Mantener o aumentar subsidios directos al precio de la gasolina, diésel y otros combustibles fósiles para el sector transporte.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "SE_Tarifas_Electricas_Subsidiadas_Industria_Pesada": { id: "SE_Tarifas_Electricas_Subsidiadas_Industria_Pesada", name: "Tarifas Eléctricas Subsidiadas para Industria Pesada", description: "Ofrecer tarifas eléctricas preferenciales y subsidiadas para grandes consumidores industriais, especialmente aqueles dependientes de energía fósil.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "SE_Incentivos_Exploracion_Explotacion_Hidrocarburos": { id: "SE_Incentivos_Exploracion_Explotacion_Hidrocarburos", name: "Incentivos a la Exploración y Explotación de Hidrocarburos", description: "Proporcionar beneficios fiscales, royalties reducidos u otras facilidades para la exploración y explotación de nuevas reservas de petróleo y gas.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
    "SE_Congelamiento_Precios_Gas_GLP_Residencial": { id: "SE_Congelamiento_Precios_Gas_GLP_Residencial", name: "Congelamiento de Precios de Gas Natural y GLP Residencial", description: "Establecer políticas de congelamiento o control de precios para el gas natural y GLP destinado al consumo doméstico y comercial.", effortPercentage: 0, baseEffectivenessFactor: DEFAULT_INSTRUMENT_EFFECTIVENESS },
  },
};


export const INITIAL_POLICIES: Record<Policy, PolicyState> = {
  [Policy.Agroecological]: {
    id: Policy.Agroecological, name: "Políticas Agroecológicas", isActive: false,
    description: "Fomenta prácticas agrícolas sostenibles, mejorando la biodiversidad y la salud del suelo.", costFactor: 0.04, stellaName: "Políticas_Agroecológicas",
    initialEfficiency: 1, efficiencyDecayDuration: 10, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.Agroecological])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.NaturalConservation]: {
    id: Policy.NaturalConservation, name: "Conservación de Bienes Naturales", isActive: false,
    description: "Protege ecosistemas clave, crucial para la biodiversidad y la captura de carbono.", costFactor: 0.05, stellaName: "Políticas_de_Conservación_de_los_Bienes_Naturales",
    initialEfficiency: 1, efficiencyDecayDuration: 15, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.NaturalConservation])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.SustainableLivestock]: {
    id: Policy.SustainableLivestock, name: "Ganadería Sostenible", isActive: false,
    description: "Promueve métodos de pastoreo y manejo que reducen emisiones y mejoran el uso del suelo.", costFactor: 0.03, stellaName: "Políticas_de_Ganadería_Sostenible",
    initialEfficiency: 1, efficiencyDecayDuration: 8, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.SustainableLivestock])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.SustainableWaterManagement]: {
    id: Policy.SustainableWaterManagement, name: "Gestión Sostenible del Agua", isActive: false,
    description: "Asegura el uso eficiente y la conservación del agua, vital para la agricultura y el bienestar social.", costFactor: 0.05, stellaName: "Políticas_de_Gestión_Sostenible_del_Recurso_Hídrico",
    initialEfficiency: 1, efficiencyDecayDuration: 12, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.SustainableWaterManagement])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.CarbonNeutrality]: {
    id: Policy.CarbonNeutrality, name: "Neutralidad de Carbono", isActive: false,
    description: "Implementa medidas amplias para reducir emisiones netas (renovables, impuestos al carbono).", costFactor: 0.07,  // Increased: carbon neutrality is ambitions and expensive — teaches fiscal tradeoff stellaName: "Políticas_de_Carbono_Neutralidad",
    initialEfficiency: 1, efficiencyDecayDuration: 20, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.CarbonNeutrality])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.IntensiveAgriculture]: {
    id: Policy.IntensiveAgriculture, name: "Agricultura Intensiva", isActive: false,
    description: "Busca maximizar la producción agrícola a corto plazo, con posibles costos ambientales.", costFactor: 0.02, stellaName: "Políticas_Agrícolas_Intensivas",
    initialEfficiency: 1, efficiencyDecayDuration: 5, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.IntensiveAgriculture])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.AgriculturalExports]: {
    id: Policy.AgriculturalExports, name: "Exportaciones Agrícolas", isActive: false,
    description: "Fomenta la venta de productos agrícolas al exterior, mejorando la balanza comercial.", costFactor: 0.01, stellaName: "Políticas_de_Exportaciones_Agrícolas",
    initialEfficiency: 1, efficiencyDecayDuration: 6, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.AgriculturalExports])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.ForeignInvestment]: {
    id: Policy.ForeignInvestment, name: "Inversión Extranjera", isActive: false,
    description: "Atrae capital extranjero para el desarrollo industrial, pudiendo aumentar el PBI.", costFactor: 0.02, stellaName: "Políticas_de_Inversión_Extranjera",
    initialEfficiency: 1, efficiencyDecayDuration: 7, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.ForeignInvestment])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.FlexibleEnvironmentalRegulations]: {
    id: Policy.FlexibleEnvironmentalRegulations, name: "Normativas Ambientales Flexibles", isActive: false,
    description: "Reduce regulaciones ambientales para estimular actividad económica, con riesgos ambientales.", costFactor: 0.01, stellaName: "Políticas_de_Normativas_Ambientales_Flexibles",
    initialEfficiency: 1, efficiencyDecayDuration: 4, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.FlexibleEnvironmentalRegulations])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
  [Policy.EnergySubsidies]: {
    id: Policy.EnergySubsidies, name: "Subsidios Energéticos", isActive: false,
    description: "Reduce el costo de la energía (a menudo fósil), impactando finanzas y balance de carbono.", costFactor: 0.02, stellaName: "Políticas_de_Subsidios_Energéticos",
    initialEfficiency: 1, efficiencyDecayDuration: 3, currentEfficiency: 1,
    instruments: JSON.parse(JSON.stringify(INITIAL_POLICY_INSTRUMENTS[Policy.EnergySubsidies])), totalInstrumentEffortApplied: 0, activationYear: undefined,
  },
};


export const INITIAL_LAND_USES: Record<LandUseType, LandUse> = {
  [LandUseType.UnprotectedNativeForest]: {
    name: "Bosque Nativo No Protegido", area: 100, stellaName: "\"Bosque_Nativo_No_Protegido_(BNNP)\"",
    emissionRate: 0.75, sequestrationRate: 5,
    document: "Áreas de bosques compuestas principalmente por especies de árboles y vegetación que son endémicas de la región, actualmente sin un estatus de protección legal formal que restrinja actividades extractivas o de conversión de uso de suelo. Son vulnerables a la deforestación y degradación."
  },
  [LandUseType.ProtectedNativeForest]: {
    name: "Bosque Nativo Protegido", area: 0, stellaName: "\"Bosque_Nativo_Protegido_(BNP)\"",
    emissionRate: 0.75, sequestrationRate: 5,
    document: "Superficie de Bosque Nativo que, mediante decisiones políticas, ha sido designada bajo un régimen de protección legal (ej. Parque Nacional, Reserva Natural). Esto implica restricciones a actividades humanas para conservar su biodiversidad y servicios ecosistémicos."
  },
  [LandUseType.AgroecologicalCrops]: {
    name: "Cultivos Agroecológicos", area: 100, stellaName: "\"Cultivos_Agroecológicos_(CA)\"",
    emissionRate: 0.5, sequestrationRate: 1.9,
    document: "Prácticas de cultivo que buscan integrar aspectos ambientales, económicos y sociales, minimizando el uso de insumos externos sintéticos, promoviendo la biodiversidad funcional, la salud del suelo y el cierre de ciclos de nutrientes. Suelen tener menor emisión y mayor secuestro de C que los convencionales."
  },
  [LandUseType.ConventionalCrops]: {
    name: "Cultivos Convencionales", area: 100, stellaName: "\"Cultivos_Convencionales_(CC)\"",
    emissionRate: 8.0, sequestrationRate: 0.9,
    document: "Refiere a la agricultura moderna que utiliza métodos de cultivo intensivos, incluyendo el uso de fertilizantes sintéticos, pesticidas, maquinaria pesada y, a menudo, monocultivos. Busca altos rendimientos pero puede tener mayores emisiones y menor capacidad de secuestro de carbono."
  },
  [LandUseType.ForestPlantations]: {
    name: "Plantaciones Forestales", area: 100, stellaName: "\"Plantaciones_Forestales_(PF)\"",
    emissionRate: 1.5, sequestrationRate: 2.4,
    document: "Áreas donde se cultivan árboles, generalmente de rápido crecimiento y a menudo especies exóticas, con fines comerciales (madera, pulpa) o para restauración. Su balance de carbono varía según la especie, manejo y edad."
  },
  [LandUseType.GrasslandsPastures]: {
    name: "Praderas y Pasturas para Ganadería", area: 100, stellaName: "\"Praderas_Ganadería_(PRG)\"",
    emissionRate: 5.0, sequestrationRate: 0.24,
    document: "Extensiones de terreno cubiertas principalmente por pastos y otras herbáceas, utilizadas para la cría y alimentación de ganado. Su manejo (intensivo vs. extensivo, tipo de pastura) influye significativamente en su balance de carbono."
  },
};
export const TOTAL_LAND_AREA = Object.values(INITIAL_LAND_USES).reduce((sum, lu) => sum + lu.area, 0);


export const LEVEL_2_INITIAL_LAND_USES: Record<LandUseType, LandUse> = {
  [LandUseType.UnprotectedNativeForest]: { ...INITIAL_LAND_USES[LandUseType.UnprotectedNativeForest], area: 80 },
  [LandUseType.ProtectedNativeForest]: { ...INITIAL_LAND_USES[LandUseType.ProtectedNativeForest], area: 20, sequestrationRate: 5.2 },
  [LandUseType.AgroecologicalCrops]: { ...INITIAL_LAND_USES[LandUseType.AgroecologicalCrops], area: 70, sequestrationRate: 2.0 },
  [LandUseType.ConventionalCrops]: { ...INITIAL_LAND_USES[LandUseType.ConventionalCrops], area: 150 },
  [LandUseType.ForestPlantations]: { ...INITIAL_LAND_USES[LandUseType.ForestPlantations], area: 120 },
  [LandUseType.GrasslandsPastures]: { ...INITIAL_LAND_USES[LandUseType.GrasslandsPastures], area: 160 },
};
export const LEVEL_2_TOTAL_LAND_AREA = Object.values(LEVEL_2_INITIAL_LAND_USES).reduce((sum, lu) => sum + lu.area, 0);


export const LEVEL_3_INITIAL_LAND_USES: Record<LandUseType, LandUse> = {
  [LandUseType.UnprotectedNativeForest]: { ...INITIAL_LAND_USES[LandUseType.UnprotectedNativeForest], area: 60 },
  [LandUseType.ProtectedNativeForest]: { ...INITIAL_LAND_USES[LandUseType.ProtectedNativeForest], area: 40 },
  [LandUseType.AgroecologicalCrops]: { ...INITIAL_LAND_USES[LandUseType.AgroecologicalCrops], area: 100 },
  [LandUseType.ConventionalCrops]: { ...INITIAL_LAND_USES[LandUseType.ConventionalCrops], area: 100 },
  [LandUseType.ForestPlantations]: { ...INITIAL_LAND_USES[LandUseType.ForestPlantations], area: 150 },
  [LandUseType.GrasslandsPastures]: { ...INITIAL_LAND_USES[LandUseType.GrasslandsPastures], area: 150 },
};
export const LEVEL_3_TOTAL_LAND_AREA = Object.values(LEVEL_3_INITIAL_LAND_USES).reduce((sum, lu) => sum + lu.area, 0);


export const INITIAL_STELLA_STOCKS: StellaStocks = {
  Conteo_Agric_Intens: 0, Conteo_Agroecologica: 0, Conteo_Agua: 0, Conteo_Ambiental_Flex: 0,
  Conteo_Bienes_Natu: 0, Conteo_Carbono_Neut: 0, Conteo_Export_Agric: 0, Conteo_Ganaderia_Sost: 0,
  Conteo_Inver_Extran: 0, Conteo_Subsidios: 0, MEAN_colapso: 0,
  Poblacion_Total: 10000000,
  PP_AGRICOLA: 30, PP_AMBIENTALISTA: 30, PP_SOCIAL: 30,
  Colapso_politico: 0,
  Deuda: 0,
  Flag_Prestamo_Tomado_Stock: 0,
  PBI_Real: 10000,
  Puntaje_General: 0,
  Reservas_del_Tesoro: 1000,
  Cumplimiento_Nivel_1: 0, Cumplimiento_Nivel_2: 0, Cumplimiento_Nivel_3: 0,
  Nivel_1_Active: true, Nivel_2_Active: false, Nivel_3_Active: false,
  Desactivar_Nivel_1: 0, Desactivar_Nivel_2: 0, Desactivar_Nivel_3: 0,
  Tiempo_Activacion_Políticas_Agrícolas_Intensivas: 0, Tiempo_Activacion_Políticas_Agroecológicas: 0,
  Tiempo_Activacion_Políticas_de_Carbono_Neutralidad: 0, Tiempo_Activacion_Políticas_de_Conservación_de_los_Bienes_Naturales: 0,
  Tiempo_Activacion_Políticas_de_Exportaciones_Agrícolas: 0, Tiempo_Activacion_Políticas_de_Ganadería_Sostenible: 0,
  Tiempo_Activacion_Políticas_de_Gestión_Sostenible_del_Recurso_Hídrico: 0, Tiempo_Activacion_Políticas_de_Inversión_Extranjera: 0,
  Tiempo_Activacion_Políticas_de_Normativas_Ambientales_Flexibles: 0, Tiempo_Activacion_Políticas_de_Subsidios_Energéticos: 0,
  Conflicto_social: 5,
  Conteo_Chatgpt: 0,
};

export const LEVEL_2_INITIAL_STELLA_OVERRIDES: Partial<StellaStocks> = {
  PP_AGRICOLA: 20,
  PP_AMBIENTALISTA: 25,
  PP_SOCIAL: 15,
  Conflicto_social: 40,
  Colapso_politico: 30,
};

export const LEVEL_3_INITIAL_STELLA_OVERRIDES: Partial<StellaStocks> = {
  PP_AGRICOLA: 25,
  PP_AMBIENTALISTA: 20,
  PP_SOCIAL: 20,
  Conflicto_social: 40,
  Colapso_politico: 30,
  Deuda: 5000,
  PBI_Real: 12000,
};

export const LEVEL_2_INITIAL_INDICATOR_OVERRIDES: InitialIndicatorOverrides = {
  foodSecurity: 40,
  economicSecurity: 30,
};

export const LEVEL_3_INITIAL_INDICATOR_OVERRIDES: InitialIndicatorOverrides = {
  foodSecurity: 40,
  economicSecurity: 30,
};


export const INITIAL_INDICATORS = {
  biodiversity: 40,
  foodSecurity: 35,
  economicSecurity: 25,
  socialWellbeing: 100 - INITIAL_STELLA_STOCKS.Conflicto_social,
  co2EqEmissionsPerCapita: 6.5,  // More realistic starting point for a mid-income nation (~10M pop)
  politicalStability: 100 - INITIAL_STELLA_STOCKS.Colapso_politico,
  generalScore: INITIAL_STELLA_STOCKS.Puntaje_General,
  pbi: INITIAL_STELLA_STOCKS.PBI_Real,
  treasuryReserves: INITIAL_STELLA_STOCKS.Reservas_del_Tesoro,
  debt: INITIAL_STELLA_STOCKS.Deuda,
  ppAgricola: INITIAL_STELLA_STOCKS.PP_AGRICOLA,
  ppAmbientalista: INITIAL_STELLA_STOCKS.PP_AMBIENTALISTA,
  ppSocial: INITIAL_STELLA_STOCKS.PP_SOCIAL,
  cumplimientoNivel1: INITIAL_STELLA_STOCKS.Cumplimiento_Nivel_1,
  cumplimientoNivel2: INITIAL_STELLA_STOCKS.Cumplimiento_Nivel_2,
  cumplimientoNivel3: INITIAL_STELLA_STOCKS.Cumplimiento_Nivel_3,
};


export const INITIAL_FINANCES = {
  pbi: INITIAL_STELLA_STOCKS.PBI_Real,
  treasuryReserves: INITIAL_STELLA_STOCKS.Reservas_del_Tesoro,
  debt: INITIAL_STELLA_STOCKS.Deuda,
};

export const INITIAL_PACTS: Record<string, Pact> = {
  globalCarbonAccord: {
    id: 'globalCarbonAccord', name: "Acuerdo Global de Carbono",
    description: "Comprometerse con metas globales de reducción de carbono, mejorando los esfuerzos de secuestro y la reputación internacional, pero puede requerir ajustes económicos.",
    isActive: false,
    unlockYear: 2035,
    costToJoin: 500,
    annualCost: 50,
    effects: (indicators, stellaStocks) => ({
      indicators: {
        co2EqEmissionsPerCapita: (indicators.co2EqEmissionsPerCapita || 0) * 0.95, // 5% reduction
        politicalStability: (indicators.politicalStability || 0) + 3,
        economicSecurity: (indicators.economicSecurity || 0) - 2,
      },
      stellaStocks: {}
    })
  },
  biodiversityTreaty: {
    id: 'biodiversityTreaty', name: "Tratado de Preservación de la Biodiversidad",
    description: "Unirse a esfuerzos internacionales para proteger la biodiversidad, impulsando la conservación pero potencialmente limitando algunas actividades económicas.",
    isActive: false,
    unlockYear: 2030,
    costToJoin: 300,
    annualCost: 30,
    effects: (indicators, stellaStocks) => ({
      indicators: {
        biodiversity: (indicators.biodiversity || 0) + 5,
        economicSecurity: (indicators.economicSecurity || 0) - 1,
      },
      stellaStocks: {},
      landUseChangeFactors: {
        tasa_BNNP_a_BNP: 1.5, // Aumenta la tasa de protección de bosque en un 50%
        tasa_BNNP_a_CC: 0.5, // Reduce la tasa de deforestación para cultivos convencionales en un 50%
      }
    })
  },
  techTransferInitiative: {
    id: 'techTransferInitiative', name: "Iniciativa de Transferencia Tecnológica",
    description: "Participar en un programa de intercambio de tecnología para energía limpia y prácticas sostenibles, mejorando la eficiencia pero requiriendo inversión inicial.",
    isActive: false,
    unlockYear: 2038,
    costToJoin: 1000,
    annualCost: 100,
    effects: (indicators, stellaStocks) => ({
      indicators: {
        co2EqEmissionsPerCapita: (indicators.co2EqEmissionsPerCapita || 0) * 0.9, // 10% reduction
        economicSecurity: (indicators.economicSecurity || 0) + 2,
      },
      stellaStocks: {}
    })
  }
};


export const CONTROL_PARAMS: ControlParams = {
  Factor_sensibilidad_Indicador_eficiencia: 0,
  Max_Emisiones_Referencia_Anual: 10000,
  Ano_Activacion_Prestamo: 2035,
  Monto_del_Prestamo_Unico: 5000000,
  Referencia_Max_CO2_per_Capita_Puntaje: 12,  // Adjusted ceiling — keeps scoring meaningful with lower starting emissions
  Umbral_polarizacion: 70,
  Tasa_Impositiva_General_Sobre_PBI: 0.15,
  Tasa_Base_Crecimiento_PBI: 0.02,
  Tasa_Crecimiento_Poblacional_Base: 0.008,
  FACTOR_C_A_CO2EQ: 3.67,
  Tasa_Transicion_Emisiones_Base: 0.2,
  Punto_Saturacion_Emisiones: 2.0,

  Pago_deuda_anual_Nivel_1: 0.15,
  Pago_deuda_anual_Nivel_2: 0.12,
  Pago_deuda_anual_Nivel_3: 0.1,

  Amplificacion_mediatica_social_Nivel_1: 0.02,
  Amplificacion_mediatica_social_Nivel_2: 0.03,
  Amplificacion_mediatica_social_Nivel_3: 0.04,

  Duracion_Efecto_Al: 5, Duracion_Efecto_CBN: 15, Duracion_Efecto_CN: 20,
  Duracion_Efecto_EA: 6, Duracion_Efecto_GRH: 12, Duracion_Efecto_GS: 8,
  Duracion_Efecto_IE: 7, Duracion_Efecto_NAF: 4, Duracion_Efecto_PA: 10,
  Duracion_Efecto_SE: 3,

  Factor_Impulso_Presion_Agricola: 5,
  Factor_Impulso_Presion_Ambientalista: 3,
  Factor_Impulso_Presion_Social: 4,

  Tasa_disipacion_social: 0.09, // Ajustado de 0.07 para aumentar más la resiliencia social
  Tasa_disipacion_agricola_Nivel_1: 0.13, Tasa_disipacion_agricola_Nivel_2: 0.09, Tasa_disipacion_agricola_Nivel_3: 0.06,
  Tasa_disipacion_ambientalista_Nivel_1: 0.08, Tasa_disipacion_ambientalista_Nivel_2: 0.06, Tasa_disipacion_ambientalista_Nivel_3: 0.04,

  Peso_Influencia_Presiones_CP: 0.30,
  Peso_Factor_Polarizacion_CP: 0.70,
  Peso_Agricola_Colapso: 0.4,
  Peso_Ambientalista_Colapso: 0.2,
  Peso_Social_Colapso: 0.4,

  Ponderacion_CO2_Nivel_1: 0.4, Ponderacion_CO2_Nivel_2: 0.35, Ponderacion_CO2_Nivel_3: 0.33,
  Ponderacion_Externalidades_Nivel_1: 0.4, Ponderacion_Externalidades_Nivel_2: 0.35, Ponderacion_Externalidades_Nivel_3: 0.33,
  Ponderacion_Usos_coberturas_Nivel_1: 0.2, Ponderacion_Usos_coberturas_Nivel_2: 0.3, Ponderacion_Usos_coberturas_Nivel_3: 0.34,

  Peso_Biodiversidad_Ext: 0.25,
  Peso_Seguridad_Alimentaria_Ext: 0.25,
  Peso_Seguridad_Economica_Ext: 0.25,
  Peso_Bienestar_Social_Ext: 0.25,

  Peso_BNNP_Nivel_1: 0.1, Peso_BNP_Nivel_1: 0.25, Peso_CA_Nivel_1: 0.05,
  Peso_CC_Nivel_1: -0.15, Peso_PF_Nivel_1: -0.1, Peso_PRG_Nivel_1: -0.05,

  Umbral_Influencia_Agricola_Nivel_1: 0.5, Umbral_Influencia_Agricola_Nivel_2: 0.7, Umbral_Influencia_Agricola_Nivel_3: 0.9,

  Tasa_de_interes_Nivel_1: 0.025, Tasa_de_interes_Nivel_2: 0.035, Tasa_de_interes_Nivel_3: 0.045,
  Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso: 0.2,
  Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso: 0.8,
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso: 0.4,
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso: 0.5,
  Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso: 0.1,
  Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso: 0.65,
  Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso: 0.30,
  Impacto_Biodiversidad_en_SE_Peso: 0.05,
  Factor_Impacto_Politicas_y_Presiones_en_Bienestar_Peso: 0.60,
  Factor_Impacto_Usos_en_Bienestar_Peso: 0.40,
  Impacto_Submodulos_en_Bienestar_Peso: 0.25,
  Impacto_Sinergias_Antagonismos_Bienestar_Peso: 0.05,
  Punto_Inflexion_SA_Biodiversidad: 60,
  Punto_Inflexion_SE_Biodiversidad: 70,
  Punto_Inflexion_BS_Biodiversidad: 70,
  Punto_Inflexion_BS_SA: 85,
  Punto_Inflexion_BS_SE: 80,
  Capacidad_Maxima_SA_Impacto_Biodiversidad: 100,
  Capacidad_Maxima_SA_Impacto_SE: 60,
  Capacidad_Maxima_BS_Impacto_Biodiversidad: 0,
  Capacidad_Maxima_BS_Impacto_SA: 60,
  Capacidad_Maxima_BS_Impacto_SE: 80,

  Peso_Ant_C_SE_Carbono_Stella: 0.1,
  Peso_Sin_CR_C_Carbono_Stella: 0.1,

  Tasa_de_BNNP_a_BNP_Base: 0.008,
  Tasa_de_BNNP_a_CA_Base: 0.002,
  Tasa_de_BNNP_a_CC_Base: 0.01,
  Tasa_de_CA_a_BNNP_Base: 0.001,
  Tasa_de_CC_a_CA_Base: 0.005,

  // --- REBALANCEO DE DINÁMICAS (v3) ---
  // Sistema de Presión por Impulso/Disipación y rebalanceo de impactos.

  // Political Pressure Policy Effects (Negative values decrease pressure, positive values increase pressure) - REBALANCED v3
  Factor_Presion_Agricola_PAS: -2.0,      // FIX: Agroecological should REDUCE agricultural pressure (farmers benefiting)
  Factor_Presion_Agricola_PGS: -1.5,      // FIX: Sustainable livestock also benefits farmers → reduces pressure
  Factor_Presion_Agricola_PPAI: -10.0,    // Slightly reduced — still the main lever but less dominant
  Factor_Presion_Agricola_PPEA: -6.0,     // Slightly reduced     

  Factor_Presion_Ambiental_PAS: -5.0,     
  Factor_Presion_Ambiental_PCR: -12.5,    
  Factor_Presion_Ambiental_PGS: -4.0,     
  Factor_Presion_Ambiental_PAGUA: -4.0,   
  Factor_Presion_Ambiental_PCN: -9.0,     
  Factor_Presion_Ambiental_PPAI_Neg: 7.5, 
  Factor_Presion_Ambiental_PFRA_Neg: 12.5, 
  Factor_Presion_Ambiental_PSE_Neg: 10.0,  

  Factor_Presion_Social_PAS: -5.0,        
  Factor_Presion_Social_PAGUA: -3.5,      
  Factor_Presion_Social_PCN: -3.5,        
  Factor_Presion_Social_PCR: -2.5,        
  Factor_Presion_Social_PPAI_Neg: 5.0,    
  Factor_Presion_Social_PPIE_Neg: 3.5,    
  Factor_Presion_Social_PFRA_Neg: 7.5,    

  // Political Pressure Baseline Indicator Sensitivities & Targets - REBALANCED v3
  Sensibilidad_PP_Agricola_SegEconomica: 0.3,
  Umbral_PP_Agricola_SegEconomica: 50,
  Sensibilidad_PP_Agricola_SegAlimentaria: 0.2,  // Reduced sensitivity — less punishing
  Umbral_PP_Agricola_SegAlimentaria: 50,          // Lower threshold — only triggers at truly critical food security
  
  Sensibilidad_PP_Ambiental_Biodiversidad: 0.35,
  Umbral_PP_Ambiental_Biodiversidad: 45,
  Sensibilidad_PP_Ambiental_CO2PerCapita: 0.6,
  Umbral_PP_Ambiental_CO2PerCapita: 8,
  
  Sensibilidad_PP_Social_BienestarSocial: 0.4,
  Umbral_PP_Social_BienestarSocial: 50,
  
  // Direct Carbon Impact Factors for Specific Policy Instruments - REBALANCED v3
  Factor_Reduccion_Emisiones_Renovables_PCN: 0.05,
  Factor_Aumento_Secuestro_CAC_PCN: 100,
  Factor_Aumento_Emisiones_Fosiles_PSE: 0.15, // Aumentado drásticamente
  Factor_Aumento_Emisiones_AgroIntensivo_PPAI: 0.08, // Nuevo factor de emisiones

  // Fiscal Pressure Parameters (Level 3)
  Max_Additional_Tax_Rate_Percentage: 20,
  EcoSec_Reduction_Factor_Per_Tax_Point: 0.25,
  SocialConflict_Increase_Factor_Per_Tax_Point: 0.08, // Ajustado de 0.15 para suavizar más el impacto
  PBIGrowth_Reduction_Factor_Per_Tax_Point: 0.0002,
  PPSocial_Increase_Factor_Per_Tax_Point: 0.4,
  CO2_EMISSIONS_SCALING_FACTOR: 40000,
};


const CHATBOT_BASE_INSTRUCTION = `Eres DecarboNito, un asesor experto para el juego de simulación DecarboNation. Tu objetivo es ayudar al jugador a entender las mecánicas del juego, las consecuencias de sus decisiones y a formular estrategias para alcanzar la sostenibilidad y reducir las emisiones de gases de efecto invernadero.

**REGLAS CRÍTICAS E INVIOLABLES:**
1.  **SÉ EXTREMADAMENTE CONCISO:** Tu respuesta NUNCA debe superar 120 palabras, salvo que el jugador pida explícitamente "explícame en detalle" o "análisis profundo". Usa máximo 3 viñetas cortas si corresponde. Prioriza 1 insight accionable sobre múltiples observaciones generales. Si la respuesta necesita más de 120 palabras, divide en dos mensajes separados.
2.  **FUNDAMENTAL: ANCLAJE ESTRICTO A LA INFORMACIÓN PROPORCIONADA:** Basa TODAS tus sugerencias ÚNICAMENTE en la información proporcionada en el "CONTEXTO DEL JUEGO". Es ABSOLUTAMENTE PROHIBIDO inventar, alucinar o sugerir políticas, acciones, pactos o conceptos que no estén explícitamente listados en el contexto.
    - **Políticas Disponibles:** El contexto contiene una sección "TODAS las Políticas Disponibles en el Juego". NUNCA menciones una política que no esté en esa lista. Refiérete a ellas por su nombre exacto.
    - **Acciones del Jugador:** El contexto contiene una sección "Acciones Disponibles para el Jugador en el Nivel X". Basa tus recomendaciones ÚNICAMENTE en esas acciones.
    - **Conecta Consejos a Acciones:** Siempre que des un consejo, conéctalo a una de las acciones concretas disponibles. Por ejemplo, en lugar de decir 'mejora la salud', di 'Para mejorar el bienestar social, podrías activar la política de "Gestión Sostenible del Agua", que está en la lista de disponibles'.
3.  **TRADUCE DATOS A PERSPECTIVAS:** No te limites a repetir los números del estado del juego. Explica el 'por qué' detrás de los datos y qué significan en términos de gobernanza, sostenibilidad y estrategia a largo plazo, siempre en el marco de las acciones disponibles.

Analiza el CONTEXTO DEL JUEGO proporcionado y la pregunta del jugador. Ofrece explicaciones claras, identifica trade-offs y sinergias entre las políticas y acciones listadas. No tomes decisiones por el jugador, sino empodéralo con conocimiento. El indicador clave de emisiones es 'CO2eq per cápita'; un valor bajo es favorable.
Responde siempre en ESPAÑOL. Puedes usar markdown.`;


export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    levelNumber: 1,
    name: "Estrategia Nacional Fundacional",
    headerSuffix: "- Estrategia Nacional",
    description: "Establecer políticas nacionales fundamentales para la descarbonización y sostenibilidad. Enfocarse en reducir las emisiones per cápita, proteger la biodiversidad, y la adaptación al cambio climático en el sector AFOLU. Se deben sentar las bases para una transición justa y equitativa.",
    chatbotSystemInstruction: `${CHATBOT_BASE_INSTRUCTION}
Contexto Específico del Nivel 1 (Estrategia Nacional Fundacional):
En este nivel, el jugador se enfoca en sentar las bases con políticas nacionales.
**REGLA ADICIONAL CLAVE PARA NIVEL 1:** Al describir las acciones del jugador, menciona **SOLAMENTE** 'activar o desactivar políticas'. Ignora y **NUNCA** menciones 'asignar esfuerzo a instrumentos', 'préstamos', 'pactos' o 'presión fiscal', ya que no están disponibles.

Los indicadores clave son Biodiversidad, Emisiones de CO2eq per cápita, Porcentaje de Bosque Nativo Total y Puntaje General.
**NO menciones de forma prominente** Seguridad Alimentaria, Estabilidad Política, PBI Real ni Deuda. Sin embargo, si la Seguridad Económica cae por debajo de 20 o las Reservas del Tesoro son negativas, ADVIERTE al jugador que el costo de sus políticas supera los ingresos de la nación y que necesita considerar alguna política productiva para sostener el financiamiento.
El objetivo principal es reducir las emisiones, mejorar la biodiversidad y proteger el bosque nativo. Recuérdale al jugador la importancia del sector AFOLU.
Mantenlo simple y centrado en las políticas macro y sus efectos sobre el uso del suelo.`,
    targetYear: INITIAL_YEAR + YEARS_PER_LEVEL,
    progressionConditionsMet: (gameState: GameState) => {
        const wc = LEVEL_CONFIGS[0].winConditions;
        if (!wc) return false;
        const currentTotalLandArea = Object.values(gameState.landUses).reduce((sum, lu) => sum + lu.area, 0);
        const nativeForestArea = gameState.landUses[LandUseType.ProtectedNativeForest].area + gameState.landUses[LandUseType.UnprotectedNativeForest].area;
        const nativeForestPercentage = currentTotalLandArea > 0 ? nativeForestArea / currentTotalLandArea : 0;

        return (
            (wc.puntajeGeneralMin === undefined || gameState.indicators.generalScore >= wc.puntajeGeneralMin) &&
            (wc.biodiversityMin === undefined || gameState.indicators.biodiversity >= wc.biodiversityMin) &&
            (wc.co2EqEmissionsPerCapitaMax === undefined || gameState.indicators.co2EqEmissionsPerCapita <= wc.co2EqEmissionsPerCapitaMax) &&
            (wc.nativeForestTotalMinPercentage === undefined || nativeForestPercentage >= wc.nativeForestTotalMinPercentage)
        );
    },
    winConditions: {
      puntajeGeneralMin: 600,
      biodiversityMin: 40,
      co2EqEmissionsPerCapitaMax: 5,  // More challenging: player must actively reduce from 6.5 starting point
      nativeForestTotalMinPercentage: 0.18,
      economicSecurityMin: 20,  // NEW: minimum economic floor — pure-green portfolio without productive policies will fail
    }
  },
  {
    levelNumber: 2,
    name: "Coordinación Regional y Sostenibilidad Ampliada",
    headerSuffix: "- Coordinación Regional",
    description: "Expandir la sostenibilidad a nivel regional, gestionando indicadores socioeconómicos y presiones políticas. Introducir instrumentos de política y considerar pactos iniciales.",
    chatbotSystemInstruction: `${CHATBOT_BASE_INSTRUCTION}
Contexto Específico del Nivel 2 (Coordinación Regional y Sostenibilidad Ampliada):
En este nivel, el jugador enfrenta desafíos más complejos. Los indicadores clave ahora incluyen Seguridad Alimentaria, Seguridad Económica, Bienestar Social y Estabilidad Política. Las **presiones políticas** son fundamentales.
Se introducen los **'instrumentos de política'**: el jugador puede asignar esfuerzo a acciones específicas dentro de cada política activa para afinar sus estrategias.
**REGLA ADICIONAL CLAVE PARA NIVEL 2:** Debes utilizar el 'Historial de Acciones Recientes' del jugador, proporcionado en el contexto, para dar consejos más personalizados y relevantes. Reconoce sus estrategias pasadas (ej. "Veo que has activado principalmente políticas ambientales...") y enmarca tus recomendaciones en función de las decisiones que ha estado tomando.
Ayuda al jugador a entender las **interacciones, sinergias y antagonismos** entre diferentes políticas.
**No discutas préstamos ni presión fiscal adicional detalladamente;** son mecánicas del Nivel 3.
El objetivo es mantener un equilibrio entre desarrollo económico, bienestar social y sostenibilidad ambiental, gestionando las presiones políticas.`,
    targetYear: INITIAL_YEAR + YEARS_PER_LEVEL, 
    progressionConditionsMet: (gameState: GameState) => {
        const wc = LEVEL_CONFIGS[1].winConditions;
        if (!wc) return false;
        return (
            (wc.puntajeGeneralMin === undefined || gameState.indicators.generalScore >= wc.puntajeGeneralMin) &&
            (wc.biodiversityMin === undefined || gameState.indicators.biodiversity >= wc.biodiversityMin) &&
            (wc.co2EqEmissionsPerCapitaMax === undefined || gameState.indicators.co2EqEmissionsPerCapita <= wc.co2EqEmissionsPerCapitaMax) &&
            (wc.foodSecurityMin === undefined || gameState.indicators.foodSecurity >= wc.foodSecurityMin) &&
            (wc.economicSecurityMin === undefined || gameState.indicators.economicSecurity >= wc.economicSecurityMin) &&
            (wc.bienestarSocialMin === undefined || gameState.indicators.socialWellbeing >= wc.bienestarSocialMin) &&
            (wc.politicalStabilityMin === undefined || gameState.indicators.politicalStability >= wc.politicalStabilityMin) &&
            (wc.ppAgricolaMax === undefined || gameState.indicators.ppAgricola < wc.ppAgricolaMax) &&
            (wc.ppAmbientalistaMax === undefined || gameState.indicators.ppAmbientalista < wc.ppAmbientalistaMax) &&
            (wc.ppSocialMax === undefined || gameState.indicators.ppSocial < wc.ppSocialMax)
        );
    },
    winConditions: {
      puntajeGeneralMin: 480,
      biodiversityMin: 45,
      co2EqEmissionsPerCapitaMax: 6,
      foodSecurityMin: 50,
      economicSecurityMin: 40,
      bienestarSocialMin: 50,
      politicalStabilityMin: 45,
      ppAgricolaMax: 55,
      ppAmbientalistaMax: 55,
      ppSocialMax: 55,
    }
  },
  {
    levelNumber: 3,
    name: "Liderazgo Global en Sostenibilidad",
    headerSuffix: "- Liderazgo Global",
    description: "Alcanzar la neutralidad de carbono y liderar en sostenibilidad global, gestionando finanzas avanzadas (PBI, deuda, préstamos, impuestos), pactos complejos y eventos dinámicos.",
    chatbotSystemInstruction: `${CHATBOT_BASE_INSTRUCTION}
Contexto Específico del Nivel 3 (Liderazgo Global en Sostenibilidad):
Este es el nivel más complejo. El jugador debe lograr emisiones per cápita muy bajas y un alto desempeño en todos los indicadores.
Se introducen mecánicas financieras avanzadas: gestión del **PBI Real, Deuda, posibilidad de tomar Préstamos, y la opción de aplicar Presión Fiscal Adicional** (impuestos extra).
Hay pactos internacionales más avanzados y eventos aleatorios más frecuentes e impactantes.
**REGLA ADICIONAL CLAVE PARA NIVEL 3:** Debes utilizar el 'Historial de Acciones Recientes' del jugador, proporcionado en el contexto, para dar consejos más personalizados y relevantes. Reconoce sus estrategias pasadas (ej. "Veo que has favorecido las políticas de conservación...") y enmarca tus recomendaciones en función de las decisiones que ha estado tomando. Discute las implicaciones a largo plazo de las decisiones financieras.
El objetivo es demostrar un liderazgo integral. Ayuda al jugador a prepararse para el 'endgame', considerando todos los factores para un legado sostenible.`,
    targetYear: INITIAL_YEAR + YEARS_PER_LEVEL,
     progressionConditionsMet: (gameState: GameState) => {
        const wc = LEVEL_CONFIGS[2].winConditions;
        if (!wc) return false;
        
        let conditionsMetCount = 0;
        const debtPbiRatio = gameState.stellaSpecificState.PBI_Real > 0 ? gameState.stellaSpecificState.Deuda / gameState.stellaSpecificState.PBI_Real : Infinity;

        if (wc.puntajeGeneralMin !== undefined && gameState.indicators.generalScore >= wc.puntajeGeneralMin) conditionsMetCount++;
        if (wc.co2EqEmissionsPerCapitaMax !== undefined && gameState.indicators.co2EqEmissionsPerCapita <= wc.co2EqEmissionsPerCapitaMax) conditionsMetCount++;
        if (wc.biodiversityMin !== undefined && gameState.indicators.biodiversity >= wc.biodiversityMin) conditionsMetCount++;
        if (wc.foodSecurityMin !== undefined && gameState.indicators.foodSecurity >= wc.foodSecurityMin) conditionsMetCount++;
        if (wc.economicSecurityMin !== undefined && gameState.indicators.economicSecurity >= wc.economicSecurityMin) conditionsMetCount++;
        if (wc.bienestarSocialMin !== undefined && gameState.indicators.socialWellbeing >= wc.bienestarSocialMin) conditionsMetCount++;
        if (wc.politicalStabilityMin !== undefined && gameState.indicators.politicalStability >= wc.politicalStabilityMin) conditionsMetCount++;
        if (wc.pbiMin !== undefined && gameState.indicators.pbi >= wc.pbiMin) conditionsMetCount++;
        if (wc.deudaPbiMax !== undefined && debtPbiRatio < wc.deudaPbiMax) conditionsMetCount++;
        if (wc.colapsoPoliticoMax !== undefined && gameState.stellaSpecificState.Colapso_politico < wc.colapsoPoliticoMax) conditionsMetCount++;
        
        return conditionsMetCount >= 6;
    },
    winConditions: {
      puntajeGeneralMin: 700,
      co2EqEmissionsPerCapitaMax: 2,
      biodiversityMin: 55,
      foodSecurityMin: 60,
      economicSecurityMin: 50,
      bienestarSocialMin: 60,
      politicalStabilityMin: 50,
      pbiMin: 14000,
      deudaPbiMax: 0.7,
      colapsoPoliticoMax: 50,
    }
  }
];

export const POLICY_UI_ORDER = [
  Policy.Agroecological,
  Policy.NaturalConservation,
  Policy.SustainableLivestock,
  Policy.SustainableWaterManagement,
  Policy.CarbonNeutrality,
  Policy.IntensiveAgriculture,
  Policy.AgriculturalExports,
  Policy.ForeignInvestment,
  Policy.FlexibleEnvironmentalRegulations,
  Policy.EnergySubsidies,
];

export const ALL_RANDOM_EVENTS: RandomEvent[] = [
  // --- NEGATIVE EVENTS ---
  {
    id: "drought_severe",
    name: "Sequía Severa",
    description: "Una sequía prolongada y severa afecta las cosechas y agota las reservas de agua, generando descontento social y estrés en el sector agrícola.",
    type: 'negative',
    category: 'environmental',
    triggerChance: (gs) => {
      let chance = 0.03;
      if (!gs.policies[Policy.SustainableWaterManagement].isActive) chance += 0.04;
      if (gs.landUses[LandUseType.ConventionalCrops].area / TOTAL_LAND_AREA > 0.25) chance += 0.02;
      return chance;
    },
    effects: (gs) => [
      { indicator: 'foodSecurity', changePercentage: -0.12 },
      { indicator: 'stella.Conflicto_social', changeAbsolute: 5 },
      { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 },
      { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -(gs.landUses[LandUseType.ConventionalCrops].area * 0.03) } },
      { landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: -(gs.landUses[LandUseType.AgroecologicalCrops].area * 0.05) } },
    ],
    minLevel: 1,
  },
  {
    id: "supply_chain_crisis",
    name: "Crisis en la Cadena de Suministro",
    description: "Disrupciones globales en la logística y el transporte impactan la disponibilidad de insumos y productos, afectando la seguridad alimentaria y económica.",
    type: 'negative',
    category: 'economic',
    triggerChance: (gs) => {
      let chance = 0.03;
      if (gs.policies[Policy.AgriculturalExports].isActive) chance += 0.03;
      if (gs.policies[Policy.ForeignInvestment].isActive) chance += 0.02;
      return chance;
    },
    effects: (gs) => [
      { indicator: 'foodSecurity', changePercentage: -0.08 },
      { indicator: 'economicSecurity', changePercentage: -0.10 },
      { indicator: 'stella.PBI_Real', changePercentage: -0.015 },
    ],
    minLevel: 2,
  },
  {
    id: "international_scrutiny",
    name: "Escrutinio Ambiental Internacional",
    description: "Organismos internacionales y ONGs critican duramente el desempeño ambiental de la nación, amenazando con afectar la inversión y la reputación.",
    type: 'negative',
    category: 'political',
    triggerChance: (gs) => {
      let chance = 0;
      if (gs.indicators.biodiversity < 30) chance += 0.05;
      if (gs.indicators.co2EqEmissionsPerCapita > 12) chance += 0.05;
      if (gs.policies[Policy.FlexibleEnvironmentalRegulations].isActive) chance += 0.04;
      return chance;
    },
    effects: (gs) => [
      { indicator: 'economicSecurity', changePercentage: -0.05 },
      { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 8 },
      { indicator: 'stella.PP_SOCIAL', changeAbsolute: 4 },
    ],
    minLevel: 2,
  },
  {
    id: "global_recession",
    name: "Recesión Económica Global",
    description: "Una recesión a escala mundial contrae la demanda de exportaciones y la inversión extranjera, impactando severamente el PBI y la estabilidad económica.",
    type: 'negative',
    category: 'economic',
    triggerChance: (gs) => (gs.currentLevel >= 3 && gs.indicators.economicSecurity < 50) ? 0.08 : 0.02,
    effects: (gs) => [
      { indicator: 'stella.PBI_Real', changePercentage: -0.04 },
      { indicator: 'economicSecurity', changePercentage: -0.15 },
      { indicator: 'stella.Conflicto_social', changeAbsolute: 6 },
      { indicator: 'stella.Reservas_del_Tesoro', changePercentage: -0.05 },
    ],
    minLevel: 3,
  },
  {
    id: "fossil_fuel_shock",
    name: "Shock de Precios de Combustibles Fósiles",
    description: "Una crisis energética global dispara los precios de los combustibles fósiles, afectando los costos de producción y el poder adquisitivo de la población.",
    type: 'negative',
    category: 'economic',
    triggerChance: (gs) => {
        let chance = 0.03;
        if (gs.policies[Policy.EnergySubsidies].isActive) chance += 0.05;
        return chance;
    },
    effects: (gs) => [
        { indicator: 'economicSecurity', changePercentage: -0.1 },
        { indicator: 'stella.PBI_Real', changePercentage: -0.02 },
        { indicator: 'stella.Conflicto_social', changeAbsolute: 7 },
    ],
    minLevel: 3,
  },

  // --- POSITIVE EVENTS ---
  {
    id: "bumper_harvest",
    name: "Cosecha Excepcional",
    description: "Condiciones climáticas ideales y la adopción de buenas prácticas agrícolas resultan en una cosecha récord, impulsando la seguridad alimentaria y la economía.",
    type: 'positive',
    category: 'environmental',
    triggerChance: (gs) => {
      let chance = 0.03;
      if (gs.policies[Policy.Agroecological].isActive) chance += 0.03;
      if (gs.indicators.biodiversity > 50) chance += 0.02;
      return chance;
    },
    effects: (gs) => [
      { indicator: 'foodSecurity', changePercentage: 0.15 },
      { indicator: 'stella.PBI_Real', changePercentage: 0.01 },
      { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 },
      { indicator: 'stella.Conflicto_social', changeAbsolute: -3 },
    ],
    minLevel: 1,
  },
  {
    id: "green_tech_investment_boom",
    name: "Boom de Inversión en Tecnología Verde",
    description: "Una ola de inversión extranjera y local en tecnologías verdes acelera la transición energética y crea empleos de alta calidad, mejorando la seguridad económica.",
    type: 'positive',
    category: 'technological',
    triggerChance: (gs) => {
      let chance = 0.01;
      if (gs.policies[Policy.CarbonNeutrality].isActive) chance += 0.04;
      if (gs.policies[Policy.ForeignInvestment].isActive) chance += 0.04;
      if (gs.indicators.politicalStability > 60) chance += 0.02;
      return chance;
    },
    effects: (gs) => [
      { indicator: 'economicSecurity', changePercentage: 0.10 },
      { indicator: 'co2EqEmissionsPerCapita', changePercentage: -0.05 },
      { indicator: 'stella.PBI_Real', changePercentage: 0.025 },
      { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 },
    ],
    minLevel: 2,
  },

  // --- NEUTRAL EVENTS ---
  {
    id: "climate_justice_movement",
    name: "Movimiento por la Justicia Climática",
    description: "Un nuevo y vigoroso movimiento social emerge, demandando acciones más contundentes contra el cambio climático y por una transición justa.",
    type: 'neutral',
    category: 'social',
    triggerChance: (gs) => (gs.currentLevel >= 2 && gs.yearsSimulatedInCurrentLevel > 5) ? 0.05 : 0,
    effects: (gs) => [
      { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 7 },
      { indicator: 'stella.PP_SOCIAL', changeAbsolute: 5 },
      // If social wellbeing is high, the movement is organized and reduces overall conflict
      { indicator: 'stella.Conflicto_social', changeAbsolute: gs.indicators.socialWellbeing > 65 ? -2 : 3 },
    ],
    minLevel: 2,
  },
];


// Placeholder for PLAYER_REPORT_GUIDE_QUESTIONS
export const PLAYER_REPORT_GUIDE_QUESTIONS = {
  sections: [
    {
      title: "Estrategia General y Objetivos",
      questions: [
        "¿Cuál fue tu estrategia principal para este nivel/juego? ¿Cambió con el tiempo?",
        "¿Qué tan bien lograste los objetivos específicos del nivel/juego? ¿Dónde te quedaste corto o superaste las expectativas?",
      ],
    },
    {
      title: "Decisiones Clave y Consecuencias",
      questions: [
        "¿Cuáles fueron las 2-3 decisiones políticas (activar/desactivar políticas, asignar esfuerzo a instrumentos, tomar préstamos, unirte a pactos) más impactantes que tomaste y por qué?",
        "¿Hubo alguna decisión que tuvo consecuencias inesperadas (positivas o negativas)?",
        "Si ocurrió algún evento aleatorio, ¿cómo afectó tu estrategia y tus resultados?",
      ],
    },
    {
      title: "Gestión de Indicadores y Desafíos",
      questions: [
        "¿Qué indicadores te resultaron más difíciles de gestionar y por qué?",
        "¿Cómo manejaste los trade-offs entre diferentes indicadores (ej. desarrollo económico vs. conservación ambiental)?",
        "¿Cómo evolucionaron las presiones políticas (agrícola, ambientalista, social) y cómo respondiste a ellas?",
      ],
    },
    {
      title: "Aprendizajes y Próximos Pasos (si aplica)",
      questions: [
        "¿Qué aprendiste sobre la complejidad de la toma de decisiones para la sostenibilidad y la descarbonización?",
        "¿Qué harías diferente si volvieras a jugar este nivel/juego?",
        "¿Qué conceptos clave del juego (ej. AFOLU, LTS, servicios ecosistémicos, sinergias) entendiste mejor?",
      ],
    },
  ],
};

// Placeholder for INITIAL_REGIONAL_ZONES_DATA
export const INITIAL_REGIONAL_ZONES_DATA: RegionalZoneData[] = [
    {
        id: "zona_norte_agricola",
        name: "Región Norte Agrícola",
        carbonBalanceTrend: "stable",
        basePolicyAdoption: 30,
        focus: "Agricultura extensiva, potencial agroecológico",
        idh: 0.65,
        demographics: { population: 1500000, growthRate: 1.2 },
        employment: { rate: 60, mainSectors: ["Agricultura", "Ganadería", "Servicios Locales"] },
        structure: { agrarian: "Cultivos tradicionales y ganadería", commercial: "Comercio local de productos agrícolas", industrial: "Pequeña agroindustria" }
    },
    {
        id: "zona_centro_urbana",
        name: "Región Centro Metropolitana",
        carbonBalanceTrend: "worsening",
        basePolicyAdoption: 50,
        focus: "Industria, servicios, alta densidad poblacional",
        idh: 0.78,
        demographics: { population: 5000000, growthRate: 0.8 },
        employment: { rate: 75, mainSectors: ["Servicios", "Industria Manufacturera", "Comercio"] },
        structure: { agrarian: "Periurbana, horticultura", commercial: "Grandes centros comerciales y financieros", industrial: "Parques industriales diversos" }
    },
    {
        id: "zona_sur_forestal",
        name: "Región Sur Boscosa y Turística",
        carbonBalanceTrend: "improving",
        basePolicyAdoption: 40,
        focus: "Conservación, turismo sostenible, productos forestales no maderables",
        idh: 0.72,
        demographics: { population: 800000, growthRate: 0.5 },
        employment: { rate: 65, mainSectors: ["Turismo", "Forestería Sostenible", "Artesanías"] },
        structure: { agrarian: "Pequeña escala, orgánica", commercial: "Servicios turísticos, exportación productos naturales", industrial: "Procesamiento mínimo de madera, artesanías" }
    },
    {
        id: "zona_costera_pesquera",
        name: "Región Costera Pesquera",
        carbonBalanceTrend: "stable",
        basePolicyAdoption: 35,
        focus: "Pesca, acuicultura, turismo costero",
        idh: 0.68,
        demographics: { population: 1200000, growthRate: 1.0 },
        employment: { rate: 55, mainSectors: ["Pesca y Acuicultura", "Turismo", "Procesamiento de Pescado"] },
        structure: { agrarian: "Pequeña agricultura costera", commercial: "Comercio de productos marinos, servicios turísticos", industrial: "Plantas de procesamiento pesquero" }
    }
];


export const INDICATOR_IMPACT_WEIGHTS = {
  BIODIVERSITY: {
    POLICIES: {
      [Policy.Agroecological]: 0.15,
      [Policy.NaturalConservation]: 0.50,
      [Policy.SustainableLivestock]: 0.10,
      [Policy.SustainableWaterManagement]: 0.05,
      [Policy.CarbonNeutrality]: 0.05,
      [Policy.IntensiveAgriculture]: -0.20,
      [Policy.AgriculturalExports]: -0.05,
      [Policy.ForeignInvestment]: -0.02,
      [Policy.FlexibleEnvironmentalRegulations]: -0.30,
      [Policy.EnergySubsidies]: -0.10,
      Sinergia_AS_CR_Bio_Factor: 0.1, // Placeholder for synergy
      Sinergia_Neg_PAI_FRA_Bio_Factor: -0.15, // Placeholder for negative synergy
    },
    LAND_USE: {
      [LandUseType.UnprotectedNativeForest]: 0.20,
      [LandUseType.ProtectedNativeForest]: 0.50,
      [LandUseType.AgroecologicalCrops]: 0.10,
      [LandUseType.ConventionalCrops]: -0.30,
      [LandUseType.ForestPlantations]: -0.05,
      [LandUseType.GrasslandsPastures]: -0.10,
    }
  },
  FOOD_SECURITY: {
    POLICIES: {
      [Policy.Agroecological]: 0.20,
      [Policy.NaturalConservation]: -0.05,
      [Policy.SustainableLivestock]: 0.15,
      [Policy.SustainableWaterManagement]: 0.10,
      [Policy.CarbonNeutrality]: 0.0,
      [Policy.IntensiveAgriculture]: 0.30,
      [Policy.AgriculturalExports]: -0.1, // Can reduce domestic availability if not managed
      [Policy.ForeignInvestment]: 0.05,
      [Policy.FlexibleEnvironmentalRegulations]: 0.0,
      [Policy.EnergySubsidies]: 0.02,
      Sinergia_GS_AS_SA_Factor: 0.08, // Placeholder
    },
    LAND_USE: {
      [LandUseType.UnprotectedNativeForest]: -0.1,
      [LandUseType.ProtectedNativeForest]: -0.2,
      [LandUseType.AgroecologicalCrops]: 0.3,
      [LandUseType.ConventionalCrops]: 0.4,
      [LandUseType.ForestPlantations]: -0.05,
      [LandUseType.GrasslandsPastures]: 0.1,
    },
    BIODIVERSITY_IMPACT_ON_FOOD_SECURITY: 0.005, // e.g., 0.5% FS change per 10 points of biodiversity
    ECONOMIC_SECURITY_IMPACT_ON_FOOD_SECURITY: 0.008, // e.g., 0.8% FS change per 10 points of econ security
  },
  ECONOMIC_SECURITY: {
    POLICIES: {
      [Policy.Agroecological]: 0.05,
      [Policy.NaturalConservation]: -0.02,
      [Policy.SustainableLivestock]: 0.05,
      [Policy.SustainableWaterManagement]: 0.01,
      [Policy.CarbonNeutrality]: -0.05, // Can have initial costs
      [Policy.IntensiveAgriculture]: 0.15,
      [Policy.AgriculturalExports]: 0.25,
      [Policy.ForeignInvestment]: 0.30,
      [Policy.FlexibleEnvironmentalRegulations]: 0.10, // Short term boost
      [Policy.EnergySubsidies]: 0.05, // Can lower costs for some industries
    },
    LAND_USE: {
      [LandUseType.UnprotectedNativeForest]: 0.0,
      [LandUseType.ProtectedNativeForest]: -0.05, // Opportunity cost
      [LandUseType.AgroecologicalCrops]: 0.05,
      [LandUseType.ConventionalCrops]: 0.1,
      [LandUseType.ForestPlantations]: 0.08,
      [LandUseType.GrasslandsPastures]: 0.05,
    },
    BIODIVERSITY_IMPACT_ON_ECONOMIC_SECURITY: 0.002, // e.g. Eco-tourism, genetic resources
    VOLATILITY_FACTOR: -0.01, // e.g. if food security is very low, econ security takes a hit
  },
  SOCIAL_WELLBEING: {
    CONFLICT_INCREMENT_FACTORS: {
        DEBT_PBI_THRESHOLD: 0.8, // 80% Debt/PBI
        DEBT_PBI_IMPACT: 5, // points to conflict if threshold crossed
        POLICY_FLEX_REGS_IMPACT: 0.05, // points to conflict per % policy efficiency
        LOW_RESERVES_THRESHOLD_FACTOR: 0.05, // Treasury reserves < 5% of PBI
        POLICY_ENERGY_SUBSIDIES_LOW_RESERVES_IMPACT: 0.04, // if reserves low, this policy adds conflict
        LOW_FOOD_SECURITY_THRESHOLD: 45, // %
        LOW_FOOD_SECURITY_IMPACT: 4, // points
        LOW_ECONOMIC_SECURITY_THRESHOLD: 45, // %
        LOW_ECONOMIC_SECURITY_IMPACT: 3.5, // points (used by Social and Political)
        POLICY_INTENSIVE_AGRICULTURE_IMPACT: 0.04,
        POLICY_FOREIGN_INVESTMENT_IMPACT: 0.03, // Can sometimes cause social displacement
        POLICY_ENV_NORMS_FLEX_IMPACT: 0.06,
        LAND_USE_CC_IMPACT: 0.0005, // per % area * 100 (so 0.05 per % area)
        LAND_USE_PF_IMPACT: 0.0003, // per % area * 100 (so 0.03 per % area)
    }
  },
  POLITICAL_STABILITY: {
    COLLAPSE_INCREMENT_FACTORS: {
        LOW_SOCIAL_WELLBEING_THRESHOLD: 45, // %
        LOW_SOCIAL_WELLBEING_IMPACT: 0.15, // points to collapse
        LOW_ECONOMIC_SECURITY_THRESHOLD: 40, // % 
        LOW_ECONOMIC_SECURITY_IMPACT: 0.08, // points to collapse
        NEGATIVE_RESERVES_THRESHOLD_FACTOR: -0.05, // Treasury reserves < -5% of PBI
        NEGATIVE_RESERVES_IMPACT: 0.15,
        HIGH_POLARIZATION_IMPACT: 0.12, // If polarization > Umbral_polarizacion
        PP_AGRICOLA_THRESHOLD: 70, // %
        PP_AGRICOLA_IMPACT: 0.005, // points to collapse per % above threshold
        PP_AMBIENTALISTA_THRESHOLD: 70, // %
        PP_AMBIENTALISTA_IMPACT: 0.004,
        PP_SOCIAL_THRESHOLD: 70, // %
        PP_SOCIAL_IMPACT: 0.006,
    },
    COLLAPSE_DECREMENT_BASE: 0.02,
  }
};

export const INSTRUMENT_IMPACT_HINTS: InstrumentImpactHints = {
  // Agroecological
  "AS_Subsidios_Bioinsumos": [{ indicator: 'Biodiversidad', direction: 'positive', magnitude: 'medium' }, { indicator: 'Seg. Alimentaria', direction: 'positive', magnitude: 'low' }],
  "AS_Capacitacion_Tecnicas": [{ indicator: 'Biodiversidad', direction: 'positive', magnitude: 'medium' }, { indicator: 'Emisiones CO2', direction: 'negative', magnitude: 'medium' }],
  // Natural Conservation
  "CR_Expansion_Areas_Protegidas": [{ indicator: 'Biodiversidad', direction: 'positive', magnitude: 'high' }, { indicator: 'Seg. Alimentaria', direction: 'negative', magnitude: 'low' }],
  "CR_PSA_Bosques": [{ indicator: 'Biodiversidad', direction: 'positive', magnitude: 'medium' }, { indicator: 'Seg. Económica', direction: 'positive', magnitude: 'low' }],
  // Sustainable Livestock
  "GS_Sistemas_Silvopastoriles": [{ indicator: 'Emisiones CO2', direction: 'negative', magnitude: 'medium' }, { indicator: 'Biodiversidad', direction: 'positive', magnitude: 'medium' }],
  // Carbon Neutrality
  "C_Impuesto_Carbono_Sectorial": [{ indicator: 'Emisiones CO2', direction: 'negative', magnitude: 'high' }, { indicator: 'Seg. Económica', direction: 'negative', magnitude: 'medium' }],
  "C_Fomento_Energias_Renovables_No_Convencionales": [{ indicator: 'Emisiones CO2', direction: 'negative', magnitude: 'high' }, { indicator: 'Seg. Económica', direction: 'positive', magnitude: 'low' }],
  "C_Investigacion_Desarrollo_Captura_Carbono": [{ indicator: 'Emisiones CO2', direction: 'negative', magnitude: 'medium' }],
  // Intensive Agriculture
  "PAI_Subsidios_Fertilizantes_Quimicos_Pesticidas": [{ indicator: 'Seg. Alimentaria', direction: 'positive', magnitude: 'high' }, { indicator: 'Biodiversidad', direction: 'negative', magnitude: 'high' }, { indicator: 'Emisiones CO2', direction: 'positive', magnitude: 'medium' }],
  "PAI_Desarrollo_Variedades_Alto_Rendimento_Transgenicos": [{ indicator: 'Seg. Alimentaria', direction: 'positive', magnitude: 'medium' }],
  // Agricultural Exports
  "PEA_Acuerdos_Comerciales_Apertura_Mercados": [{ indicator: 'Seg. Económica', direction: 'positive', magnitude: 'high' }, { indicator: 'Seg. Alimentaria', direction: 'negative', magnitude: 'low' }],
  // Foreign Investment
  "PIE_Incentivos_Fiscales_Zonas_Francas": [{ indicator: 'Seg. Económica', direction: 'positive', magnitude: 'high' }, { indicator: 'Bienestar Social', direction: 'negative', magnitude: 'low' }],
  // Flexible Environmental Regulations
  "FRA_Reduccion_Tiempos_Evaluacion_Impacto_Ambiental": [{ indicator: 'Seg. Económica', direction: 'positive', magnitude: 'medium' }, { indicator: 'Biodiversidad', direction: 'negative', magnitude: 'high' }],
  "FRA_Moratorias_Sanciones_Incumplimiento_Ambiental": [{ indicator: 'Biodiversidad', direction: 'negative', magnitude: 'high' }, { indicator: 'Presión Ambientalista', direction: 'positive', magnitude: 'high' }],
  // Energy Subsidies
  "SE_Subsidios_Directos_Combustibles_Fosiles_Transporte": [{ indicator: 'Emisiones CO2', direction: 'positive', magnitude: 'high' }, { indicator: 'Bienestar Social', direction: 'positive', magnitude: 'low' }],
  "SE_Incentivos_Exploracion_Explotacion_Hidrocarburos": [{ indicator: 'Emisiones CO2', direction: 'positive', magnitude: 'high' }, { indicator: 'Seg. Económica', direction: 'positive', magnitude: 'medium' }],
};