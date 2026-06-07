import { Language } from '../hooks/useLanguage';

// ─── Policies ────────────────────────────────────────────────────────────────
export const POLICY_NAMES: Record<string, Record<Language, string>> = {
  'Agroecological':                   { es: 'Políticas Agroecológicas',           en: 'Agro-ecological Policies' },
  'NaturalConservation':              { es: 'Conservación de Bienes Naturales',    en: 'Natural Assets Conservation' },
  'SustainableLivestock':             { es: 'Ganadería Sostenible',                en: 'Sustainable Livestock' },
  'SustainableWaterManagement':       { es: 'Gestión Sostenible del Agua',         en: 'Sustainable Water Management' },
  'CarbonNeutrality':                 { es: 'Neutralidad de Carbono',              en: 'Carbon Neutrality' },
  'IntensiveAgriculture':             { es: 'Agricultura Intensiva',               en: 'Intensive Agriculture' },
  'AgriculturalExports':              { es: 'Exportaciones Agrícolas',             en: 'Agricultural Exports' },
  'ForeignInvestment':                { es: 'Inversión Extranjera',                en: 'Foreign Investment' },
  'FlexibleEnvironmentalRegulations': { es: 'Normativas Ambientales Flexibles',    en: 'Flexible Environmental Regulations' },
  'EnergySubsidies':                  { es: 'Subsidios Energéticos',               en: 'Energy Subsidies' },
};

// ─── Instruments ─────────────────────────────────────────────────────────────
export const INSTRUMENT_NAMES: Record<string, Record<Language, string>> = {
  'AS_Subsidios_Bioinsumos':                              { es: 'Subsidios para Bioinsumos',                                    en: 'Bioinput Subsidies' },
  'AS_Capacitacion_Tecnicas':                             { es: 'Capacitación en Técnicas Agroecológicas',                      en: 'Agro-ecological Techniques Training' },
  'AS_Corredores_Biologicos':                             { es: 'Creación de Corredores Biológicos',                            en: 'Biological Corridors Creation' },
  'AS_Certificacion_Marketing':                           { es: 'Certificación y Marketing Agroecológico',                      en: 'Agro-ecological Certification & Marketing' },
  'CR_Expansion_Areas_Protegidas':                        { es: 'Expansión de Áreas Protegidas',                               en: 'Protected Areas Expansion' },
  'CR_PSA_Bosques':                                       { es: 'Pago por Servicios Ambientales (PSA) a Bosques',               en: 'Payment for Forest Ecosystem Services (PES)' },
  'CR_Control_Especies_Invasoras':                        { es: 'Control de Especies Invasoras',                               en: 'Invasive Species Control' },
  'CR_Fortalecimiento_Guardaparques':                     { es: 'Fortalecimiento de Guardaparques',                            en: 'Park Rangers Strengthening' },
  'GS_Sistemas_Silvopastoriles':                          { es: 'Promoción de Sistemas Silvopastoriles',                        en: 'Silvopastoral Systems Promotion' },
  'GS_Manejo_Pasturas_Nativas':                           { es: 'Manejo Sostenible de Pasturas',                               en: 'Sustainable Pasture Management' },
  'GS_Bancos_Forraje_Sequia':                             { es: 'Bancos de Forraje y Adaptación a Sequías',                    en: 'Fodder Banks & Drought Adaptation' },
  'GS_Genetica_Eficiente_Bajas_Emisiones':                { es: 'Mejora Genética y Dietas Eficientes',                         en: 'Genetic Improvement & Low-emission Diets' },
  'AGUA_Riego_Tecnificado_Eficiente':                     { es: 'Subsidios para Riego Tecnificado y Eficiente',                 en: 'Efficient Irrigation Subsidies' },
  'AGUA_Proteccion_Fuentes_Recarga':                      { es: 'Protección de Fuentes Hídricas y Zonas de Recarga',           en: 'Water Source & Recharge Zone Protection' },
  'AGUA_Cosecha_Almacenamiento_Lluvia':                   { es: 'Cosecha y Almacenamiento de Agua de Lluvia',                  en: 'Rainwater Harvesting & Storage' },
  'AGUA_Tratamiento_Reuso_Aguas_Servidas':                { es: 'Tratamiento y Reúso de Aguas Servidas',                       en: 'Wastewater Treatment & Reuse' },
  'C_Impuesto_Carbono_Sectorial':                         { es: 'Impuesto al Carbono Progresivo y Sectorial',                  en: 'Progressive Sectoral Carbon Tax' },
  'C_Fomento_Energias_Renovables_No_Convencionales':      { es: 'Fomento a Energías Renovables No Convencionales',             en: 'Non-conventional Renewable Energy Promotion' },
  'C_Eficiencia_Energetica_Industrial_Residencial':       { es: 'Programas de Eficiencia Energética Industrial y Residencial', en: 'Industrial & Residential Energy Efficiency' },
  'C_Investigacion_Desarrollo_Captura_Carbono':           { es: 'I+D en Captura y Almacenamiento de Carbono (CAC)',            en: 'Carbon Capture & Storage R&D' },
  'PAI_Subsidios_Fertilizantes_Quimicos_Pesticidas':      { es: 'Subsidios a Fertilizantes Químicos y Pesticidas',             en: 'Chemical Fertilizer & Pesticide Subsidies' },
  'PAI_Infraestructura_Logistica_Agroindustrial':         { es: 'Inversión en Infraestructura y Logística Agroindustrial',     en: 'Agro-industrial Infrastructure Investment' },
  'PAI_Creditos_Blandos_Maquinaria_Agricola':             { es: 'Créditos Blandos para Maquinaria Agrícola Avanzada',          en: 'Soft Loans for Advanced Agricultural Machinery' },
  'PAI_Desarrollo_Variedades_Alto_Rendimento_Transgenicos':{ es: 'I+D en Cultivos de Alto Rendimiento (Incl. Transgénicos)',   en: 'High-yield Crop R&D (incl. GMOs)' },
  'PEA_Acuerdos_Comerciales_Apertura_Mercados':           { es: 'Acuerdos Comerciales y Apertura de Nuevos Mercados',          en: 'Trade Agreements & Market Opening' },
  'PEA_Subsidios_Logistica_Exportacion':                  { es: 'Subsidios a la Logística de Exportación Agrícola',            en: 'Agricultural Export Logistics Subsidies' },
  'PEA_Promocion_Marca_Pais_Productos_Agricolas':         { es: "Promoción 'Marca País' para Productos Agrícolas",            en: "Country Brand Promotion for Agricultural Products" },
  'PEA_Flexibilizacion_Normas_Calidad_Exportacion':       { es: 'Flexibilización de Normas de Calidad para Exportación',       en: 'Export Quality Standards Relaxation' },
  'PIE_Incentivos_Fiscales_Zonas_Francas':                { es: 'Creación de Zonas Francas e Incentivos Fiscales',             en: 'Free Trade Zones & Tax Incentives' },
  'PIE_Simplificacion_Tramites_Apertura_Empresas_Extranjeras': { es: 'Simplificación de Trámites para Empresas Extranjeras',  en: 'Foreign Business Setup Simplification' },
  'PIE_Garantias_Proteccion_Inversiones_Extranjeras':     { es: 'Garantías y Protección a Inversiones Extranjeras',           en: 'Foreign Investment Guarantees & Protection' },
  'PIE_Promocion_Sectores_Estrategicos_Roadshows_Internacionales': { es: 'Promoción de Sectores Estratégicos y Roadshows Internacionales', en: 'Strategic Sector Promotion & International Roadshows' },
  'FRA_Reduccion_Tiempos_Evaluacion_Impacto_Ambiental':   { es: 'Reducción de Tiempos para Evaluación de Impacto Ambiental (EIA)', en: 'Fast-track Environmental Impact Assessment (EIA)' },
  'FRA_Moratorias_Sanciones_Incumplimiento_Ambiental':    { es: 'Moratorias o Reducción de Sanciones por Incumplimiento Ambiental', en: 'Moratoriums/Reduction of Environmental Non-compliance Penalties' },
  'FRA_Permisos_Rapidos_Uso_Recursos_Naturales':          { es: 'Agilización de Permisos para Uso de Recursos Naturales',     en: 'Fast-track Natural Resource Use Permits' },
  'FRA_Consulta_Publica_Ambiental_No_Vinculante':         { es: 'Consulta Pública Ambiental con Carácter No Vinculante',      en: 'Non-binding Environmental Public Consultation' },
  'SE_Subsidios_Directos_Combustibles_Fosiles_Transporte':{ es: 'Subsidios Directos a Combustibles Fósiles para Transporte',  en: 'Direct Fossil Fuel Transport Subsidies' },
  'SE_Tarifas_Electricas_Subsidiadas_Industria_Pesada':   { es: 'Tarifas Eléctricas Subsidiadas para Industria Pesada',      en: 'Subsidized Electricity Rates for Heavy Industry' },
  'SE_Incentivos_Exploracion_Explotacion_Hidrocarburos':  { es: 'Incentivos a la Exploración y Explotación de Hidrocarburos', en: 'Hydrocarbon Exploration & Exploitation Incentives' },
  'SE_Congelamiento_Precios_Gas_GLP_Residencial':         { es: 'Congelamiento de Precios de Gas Natural y GLP Residencial',  en: 'Residential Natural Gas & LPG Price Freeze' },
};

// ─── Indicators ──────────────────────────────────────────────────────────────
export const INDICATOR_NAMES: Record<string, Record<Language, string>> = {
  biodiversity:              { es: 'Biodiversidad',                en: 'Biodiversity' },
  co2EqEmissionsPerCapita:   { es: 'Emisiones CO₂eq/cápita',      en: 'CO₂eq/capita Emissions' },
  foodSecurity:              { es: 'Seguridad Alimentaria',        en: 'Food Security' },
  economicSecurity:          { es: 'Seguridad Económica',          en: 'Economic Security' },
  socialWellbeing:           { es: 'Bienestar Social',             en: 'Social Wellbeing' },
  politicalStability:        { es: 'Estabilidad Política',         en: 'Political Stability' },
  generalScore:              { es: 'Puntaje General',              en: 'General Score' },
  pbi:                       { es: 'PBI Real',                     en: 'Real GDP' },
  debt:                      { es: 'Deuda',                        en: 'Debt' },
  treasuryReserves:          { es: 'Reservas del Tesoro',          en: 'Treasury Reserves' },
  ppAgricola:                { es: 'Presión Agrícola',             en: 'Agricultural Pressure' },
  ppAmbientalista:           { es: 'Presión Ambientalista',        en: 'Environmental Pressure' },
  ppSocial:                  { es: 'Presión Social',               en: 'Social Pressure' },
};

// ─── Land uses ───────────────────────────────────────────────────────────────
export const LAND_USE_NAMES: Record<string, Record<Language, string>> = {
  'BNNP': { es: 'Bosque Nativo No Protegido',                   en: 'Unprotected Native Forest' },
  'BNP':  { es: 'Bosque Nativo Protegido',                      en: 'Protected Native Forest' },
  'CA':   { es: 'Cultivos Agroecológicos',                       en: 'Agro-ecological Crops' },
  'CC':   { es: 'Cultivos Convencionales',                       en: 'Conventional Crops' },
  'PF':   { es: 'Plantaciones Forestales',                       en: 'Forest Plantations' },
  'PRG':  { es: 'Praderas y Pasturas para Ganadería',           en: 'Grasslands & Pastures for Livestock' },
};

// ─── Random events ───────────────────────────────────────────────────────────
export const EVENT_NAMES: Record<string, Record<Language, string>> = {
  'drought_severe':              { es: 'Sequía Severa',                            en: 'Severe Drought' },
  'supply_chain_crisis':         { es: 'Crisis en la Cadena de Suministro',        en: 'Supply Chain Crisis' },
  'international_scrutiny':      { es: 'Escrutinio Ambiental Internacional',       en: 'International Environmental Scrutiny' },
  'global_recession':            { es: 'Recesión Económica Global',                en: 'Global Economic Recession' },
  'fossil_fuel_shock':           { es: 'Shock de Precios de Combustibles Fósiles', en: 'Fossil Fuel Price Shock' },
  'bumper_harvest':              { es: 'Cosecha Excepcional',                      en: 'Bumper Harvest' },
  'green_tech_investment_boom':  { es: 'Boom de Inversión en Tecnología Verde',    en: 'Green Technology Investment Boom' },
  'climate_justice_movement':    { es: 'Movimiento por la Justicia Climática',     en: 'Climate Justice Movement' },
};

// ─── International pacts ─────────────────────────────────────────────────────
export const PACT_NAMES: Record<string, Record<Language, string>> = {
  'globalCarbonAccord':       { es: 'Acuerdo Global de Carbono',                   en: 'Global Carbon Accord' },
  'biodiversityTreaty':       { es: 'Tratado de Preservación de la Biodiversidad', en: 'Biodiversity Preservation Treaty' },
  'techTransferInitiative':   { es: 'Iniciativa de Transferencia Tecnológica',     en: 'Technology Transfer Initiative' },
};

// ─── Regional zones (Level 2) ─────────────────────────────────────────────────
export const REGION_NAMES: Record<string, Record<Language, string>> = {
  'zona_norte_agricola':    { es: 'Región Norte Agrícola',              en: 'Northern Agricultural Region' },
  'zona_centro_urbana':     { es: 'Región Centro Metropolitana',        en: 'Central Metropolitan Region' },
  'zona_sur_forestal':      { es: 'Región Sur Boscosa y Turística',     en: 'Southern Forested & Tourist Region' },
  'zona_costera_pesquera':  { es: 'Región Costera Pesquera',            en: 'Coastal Fishing Region' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getPolicyName(id: string, lang: Language): string {
  return POLICY_NAMES[id]?.[lang] ?? id;
}
export function getInstrumentName(id: string, lang: Language): string {
  return INSTRUMENT_NAMES[id]?.[lang] ?? id;
}
export function getIndicatorName(key: string, lang: Language): string {
  return INDICATOR_NAMES[key]?.[lang] ?? key;
}
export function getLandUseName(key: string, lang: Language): string {
  return LAND_USE_NAMES[key]?.[lang] ?? key;
}
export function getEventName(id: string, lang: Language): string {
  return EVENT_NAMES[id]?.[lang] ?? id;
}
export function getPactName(id: string, lang: Language): string {
  return PACT_NAMES[id]?.[lang] ?? id;
}
export function getRegionName(id: string, lang: Language): string {
  return REGION_NAMES[id]?.[lang] ?? id;
}
