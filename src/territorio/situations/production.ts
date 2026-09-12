/**
 * Situations: production, food and technology (25).
 */
import { LandUseType } from '../../types';
import type { SituationDef } from './types';

export const PRODUCTION_SITUATIONS: SituationDef[] = [
  {
    id: 'pest-outbreak', actor: 'farmer', category: 'production', tone: 'bad', deadline: 3, weight: 4,
    wear: { ppAgricola: 0.5 },
    es: { title: 'Brote de plaga en el cereal', body: 'Una plaga resistente avanza sobre el cereal de invierno. Piden autorización de emergencia para un agroquímico restringido.' },
    en: { title: 'Pest outbreak in the cereal belt', body: 'A resistant pest is spreading through winter cereal. They want emergency clearance for a restricted pesticide.' },
    options: [
      { id: 'emergency', es: 'Autorizar el uso de emergencia', en: 'Grant the emergency clearance', effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'biodiversity', changeAbsolute: -2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 7 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 }] },
      { id: 'biological', es: 'Financiar control biológico', en: 'Fund biological control', cost: 120, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Mantener la restricción', en: 'Keep the restriction', effects: [{ indicator: 'foodSecurity', changeAbsolute: -2.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'locusts', actor: 'farmer', category: 'production', tone: 'bad', deadline: 2, weight: 2,
    wear: { ppAgricola: 0.6 },
    es: { title: 'Manga de langostas', body: 'Una manga cruzó la frontera y se instaló en los pastizales del este.' },
    en: { title: 'Locust swarm', body: 'A swarm crossed the border and settled in the eastern grasslands.' },
    options: [
      { id: 'spray', es: 'Fumigación coordinada', en: 'Coordinated spraying', cost: 130, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'biodiversity', changeAbsolute: -1.5 }] },
      { id: 'ignore', es: 'Que cada uno se defienda', en: 'Everyone fends for themselves', effects: [{ indicator: 'foodSecurity', changePercentage: -0.05 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 7 }] },
    ],
  },
  {
    id: 'foot-and-mouth', actor: 'farmer', category: 'production', tone: 'bad', deadline: 2, weight: 3,
    when: (s) => s.landUses[LandUseType.GrasslandsPastures].area > 60,
    wear: { ppAgricola: 0.7, conflict: 0.2 },
    es: { title: 'Sospecha de aftosa', body: 'Un foco sospechoso en un tambo pone en riesgo el estatus sanitario y las exportaciones de carne.' },
    en: { title: 'Suspected foot-and-mouth', body: 'A suspicious case on a dairy farm puts the sanitary status and beef exports at risk.' },
    options: [
      { id: 'cordon', es: 'Cordón sanitario y vacunación', en: 'Sanitary cordon and vaccination', cost: 200, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'deny', es: 'Negar el foco públicamente', en: 'Publicly deny the case', effects: [{ indicator: 'economicSecurity', changeAbsolute: -3 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 4 }, { indicator: 'stella.PBI_Real', changePercentage: -0.01 }] },
    ],
  },
  {
    id: 'fertilizer-price', actor: 'farmer', category: 'production', tone: 'bad', deadline: 4, weight: 4,
    wear: { ppAgricola: 0.4 },
    es: { title: 'El fertilizante se fue al doble', body: 'El precio internacional del nitrógeno se disparó. Muchos productores no van a fertilizar esta campaña.' },
    en: { title: 'Fertilizer has doubled', body: 'International nitrogen prices spiked. Many farmers will not fertilise this season.' },
    options: [
      { id: 'subsidy', es: 'Subsidiar la compra', en: 'Subsidise the purchase', cost: 190, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -6 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 4 }] },
      { id: 'bioinputs', es: 'Volcar el dinero a bioinsumos', en: 'Put the money into bioinputs', cost: 150, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 6 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -6 } }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Que lo resuelva el mercado', en: 'Let the market sort it out', effects: [{ indicator: 'foodSecurity', changeAbsolute: -2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'bumper-harvest', actor: 'farmer', category: 'production', tone: 'good', deadline: 3, weight: 4,
    wear: {},
    es: { title: 'Cosecha excepcional', body: 'El clima acompañó y los silos están llenos. Hay que decidir qué hacer con el excedente.' },
    en: { title: 'Exceptional harvest', body: 'The weather cooperated and the silos are full. What to do with the surplus is the question.' },
    options: [
      { id: 'reserve', es: 'Reserva estratégica de alimentos', en: 'Strategic food reserve', cost: 60, effects: [{ indicator: 'foodSecurity', changeAbsolute: 3 }] },
      { id: 'export', es: 'Exportar el excedente', en: 'Export the surplus', effects: [{ indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 120 }, { indicator: 'foodSecurity', changeAbsolute: -1 }] },
      { id: 'nothing', es: 'Dejar que el mercado acomode', en: 'Let the market absorb it', effects: [{ indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
    ],
  },
  {
    id: 'export-ban', actor: 'international', category: 'production', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppAgricola: 0.4 },
    es: { title: 'Un comprador cerró su mercado', body: 'El principal destino de exportación impuso barreras sanitarias a los granos de la región.' },
    en: { title: 'A buyer closed its market', body: 'The main export destination imposed sanitary barriers on the region’s grain.' },
    options: [
      { id: 'certify', es: 'Certificar trazabilidad', en: 'Certify traceability', cost: 140, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'redirect', es: 'Buscar mercados alternativos', en: 'Look for other markets', cost: 60, effects: [{ indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'Esperar a que reabran', en: 'Wait for them to reopen', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'stella.PBI_Real', changePercentage: -0.01 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'export-quota', actor: 'citizen', category: 'production', tone: 'neutral', deadline: 4, weight: 3,
    when: (s) => s.indicators.foodSecurity < 45,
    wear: { ppSocial: 0.4, ppAgricola: 0.3 },
    es: { title: 'Piden cupo a la exportación', body: 'Con la comida cara, organizaciones sociales piden retener producción en el mercado interno.' },
    en: { title: 'Calls for an export quota', body: 'With food expensive, social organisations want production kept in the domestic market.' },
    options: [
      { id: 'quota', es: 'Fijar un cupo', en: 'Set a quota', effects: [{ indicator: 'foodSecurity', changeAbsolute: 3 }, { indicator: 'economicSecurity', changeAbsolute: -1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 8 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -6 }] },
      { id: 'targeted', es: 'Programa de compra pública focalizada', en: 'Targeted public purchase programme', cost: 150, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No intervenir el comercio', en: 'Do not intervene in trade', effects: [{ indicator: 'stella.PP_SOCIAL', changeAbsolute: 6 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'cold-chain', actor: 'industry', category: 'production', tone: 'bad', deadline: 4, weight: 2,
    wear: { ppAgricola: 0.2 },
    es: { title: 'Se corta la cadena de frío', body: 'Fallas eléctricas en la planta de frío arruinan cargas enteras de fruta y carne.' },
    en: { title: 'The cold chain is failing', body: 'Power failures at the cold plant are ruining whole loads of fruit and meat.' },
    options: [
      { id: 'upgrade', es: 'Financiar el respaldo eléctrico', en: 'Fund backup power', cost: 110, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'solar', es: 'Respaldo con solar y baterías', en: 'Back it up with solar and batteries', cost: 150, effects: [{ landUseChange: { target: LandUseType.EnergyPark, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.GrasslandsPastures, changeAbsolute_kHa: -5 } }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Que lo resuelva la empresa', en: 'Leave it to the company', effects: [{ indicator: 'foodSecurity', changeAbsolute: -1.5 }, { indicator: 'economicSecurity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'post-harvest-loss', actor: 'science', category: 'production', tone: 'neutral', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Un quinto se pierde después de la cosecha', body: 'El relevamiento muestra pérdidas poscosecha del 20 % por acopio y transporte deficientes.' },
    en: { title: 'A fifth is lost after harvest', body: 'The survey shows 20% post-harvest losses from poor storage and transport.' },
    options: [
      { id: 'silos', es: 'Red de acopio comunitario', en: 'Community storage network', cost: 140, effects: [{ indicator: 'foodSecurity', changeAbsolute: 3 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'No priorizarlo', en: 'Not a priority', effects: [{ indicator: 'foodSecurity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'dairy-crisis', actor: 'farmer', category: 'production', tone: 'bad', deadline: 4, weight: 3,
    wear: { ppAgricola: 0.5, conflict: 0.2 },
    es: { title: 'Crisis de tambos chicos', body: 'El precio de la leche no cubre costos. Cierran tambos familiares cada semana.' },
    en: { title: 'Small dairies in crisis', body: 'The milk price does not cover costs. Family dairies are closing every week.' },
    options: [
      { id: 'price', es: 'Precio sostén a tambos chicos', en: 'Price floor for small dairies', cost: 170, effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -7 }, { indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'silvo', es: 'Reconversión silvopastoril con crédito', en: 'Silvopastoral conversion credit', cost: 130, effects: [{ landUseChange: { target: LandUseType.RestorationForest, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.GrasslandsPastures, changeAbsolute_kHa: -5 } }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Dejar que se concentre el sector', en: 'Let the sector consolidate', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'fishery-collapse', actor: 'citizen', category: 'production', tone: 'bad', deadline: 5, weight: 2,
    wear: { ppSocial: 0.3 },
    es: { title: 'Cae la pesca del río', body: 'Las capturas bajaron a la mitad en cinco años. Las familias pesqueras piden una veda con compensación.' },
    en: { title: 'River fishing is collapsing', body: 'Catches halved in five years. Fishing families are asking for a closed season with compensation.' },
    options: [
      { id: 'closure', es: 'Veda con compensación', en: 'Closed season with compensation', cost: 120, effects: [{ indicator: 'biodiversity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'ignore', es: 'Sin veda', en: 'No closure', effects: [{ indicator: 'biodiversity', changeAbsolute: -1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'agroecology-pilot', actor: 'farmer', category: 'production', tone: 'good', deadline: 5, weight: 4,
    wear: {},
    es: { title: 'Una cooperativa quiere reconvertirse', body: 'Cuarenta productores piden acompañamiento técnico para pasar a manejo agroecológico.' },
    en: { title: 'A cooperative wants to convert', body: 'Forty farmers are asking for technical support to move to agroecological management.' },
    options: [
      { id: 'support', es: 'Financiar la transición', en: 'Fund the transition', cost: 120, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 8 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -8 } }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -3 }] },
      { id: 'partial', es: 'Solo asistencia técnica', en: 'Technical assistance only', cost: 40, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 3 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -3 } }] },
      { id: 'ignore', es: 'No hay programa disponible', en: 'No programme available', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'seed-sovereignty', actor: 'farmer', category: 'production', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppAgricola: 0.2 },
    es: { title: 'Debate por la semilla propia', body: 'Una empresa reclama regalías por uso propio de semilla. Los pequeños productores se oponen.' },
    en: { title: 'Farm-saved seed dispute', body: 'A company is claiming royalties on farm-saved seed. Smallholders are pushing back.' },
    options: [
      { id: 'protect', es: 'Proteger el uso propio', en: 'Protect farm-saved seed', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }, { indicator: 'foodSecurity', changeAbsolute: 1 }] },
      { id: 'royalties', es: 'Reconocer las regalías', en: 'Recognise the royalties', effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'urban-gardens', actor: 'citizen', category: 'production', tone: 'good', deadline: 4, weight: 3,
    wear: {},
    es: { title: 'Huertas urbanas piden tierra', body: 'Vecinos organizados quieren producir en terrenos ociosos del ejido.' },
    en: { title: 'Urban gardens want land', body: 'Organised neighbours want to grow food on idle municipal land.' },
    options: [
      { id: 'grant', es: 'Ceder los terrenos', en: 'Grant the land', cost: 40, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'No ceder terrenos públicos', en: 'Do not hand over public land', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'machinery-credit', actor: 'industry', category: 'production', tone: 'neutral', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Línea de crédito para maquinaria', body: 'Un banco ofrece crédito blando para renovar maquinaria, con o sin condición ambiental.' },
    en: { title: 'Machinery credit line', body: 'A bank offers soft credit to renew machinery, with or without an environmental condition.' },
    options: [
      { id: 'green', es: 'Condicionarlo a maquinaria eléctrica y siembra directa', en: 'Condition it on electric machinery and no-till', effects: [{ indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 2 }] },
      { id: 'open', es: 'Sin condiciones', en: 'No conditions', effects: [{ indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 4 }] },
      { id: 'ignore', es: 'No acompañar', en: 'Stay out of it', effects: [{ indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
    ],
  },
  {
    id: 'biochar-plant', actor: 'science', category: 'technology', tone: 'good', deadline: 6, weight: 3,
    wear: {},
    es: { title: 'Planta piloto de biochar', body: 'Un consorcio propone procesar residuos agrícolas y devolver carbono estable al suelo.' },
    en: { title: 'Biochar pilot plant', body: 'A consortium proposes processing crop residues and returning stable carbon to the soil.' },
    options: [
      { id: 'build', es: 'Financiar la planta', en: 'Fund the plant', cost: 180, effects: [{ indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'foodSecurity', changeAbsolute: 1 }, { landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 4 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -4 } }] },
      { id: 'ignore', es: 'No es prioridad', en: 'Not a priority', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'precision-irrigation', actor: 'science', category: 'technology', tone: 'good', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Riego de precisión a prueba', body: 'Sensores de humedad y riego por goteo prometen la mitad del agua para el mismo rendimiento.' },
    en: { title: 'Precision irrigation on trial', body: 'Soil-moisture sensors and drip lines promise the same yield with half the water.' },
    options: [
      { id: 'scale', es: 'Escalarlo con subsidio', en: 'Scale it with a subsidy', cost: 160, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'pilot', es: 'Ampliar solo el piloto', en: 'Extend the pilot only', cost: 50, effects: [{ indicator: 'foodSecurity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'Dejarlo para más adelante', en: 'Leave it for later', effects: [] },
    ],
  },
  {
    id: 'drone-monitoring', actor: 'science', category: 'technology', tone: 'neutral', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Drones para monitoreo de cultivo', body: 'Una startup ofrece monitoreo por drones a cambio de datos abiertos de rendimiento.' },
    en: { title: 'Drones for crop monitoring', body: 'A startup offers drone monitoring in exchange for open yield data.' },
    options: [
      { id: 'accept', es: 'Aceptar el intercambio', en: 'Accept the trade', effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'Rechazar por privacidad', en: 'Decline on privacy grounds', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -2 }] },
    ],
  },
  {
    id: 'gmo-debate', actor: 'science', category: 'technology', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppAmbientalista: 0.2, ppAgricola: 0.2 },
    es: { title: 'Nuevo evento transgénico a aprobación', body: 'Un cultivo tolerante a sequía espera aprobación. Promete rendimiento; la discusión es sobre dependencia y bioseguridad.' },
    en: { title: 'A new GM event awaits approval', body: 'A drought-tolerant crop awaits clearance. It promises yield; the debate is dependence and biosafety.' },
    options: [
      { id: 'approve', es: 'Aprobarlo', en: 'Approve it', effects: [{ indicator: 'foodSecurity', changeAbsolute: 2.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 }] },
      { id: 'conditional', es: 'Aprobarlo con monitoreo obligatorio', en: 'Approve it with mandatory monitoring', cost: 70, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 2 }] },
      { id: 'reject', es: 'Rechazarlo', en: 'Reject it', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'ai-advisory', actor: 'science', category: 'technology', tone: 'neutral', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'Asesoramiento agronómico por IA', body: 'Ofrecen un servicio de recomendación automática de siembra y fertilización para toda la región.' },
    en: { title: 'AI agronomic advice', body: 'A service offers automatic sowing and fertilisation recommendations for the whole region.' },
    options: [
      { id: 'public', es: 'Adoptarlo como servicio público', en: 'Adopt it as a public service', cost: 90, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'Que lo contrate quien quiera', en: 'Let whoever wants it buy it', effects: [{ indicator: 'economicSecurity', changeAbsolute: 0.5 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'genetics-livestock', actor: 'farmer', category: 'technology', tone: 'good', deadline: 6, weight: 3,
    when: (s) => s.landUses[LandUseType.GrasslandsPastures].area > 50,
    wear: {},
    es: { title: 'Genética bovina de baja emisión', body: 'Un programa de mejoramiento ofrece animales que emiten menos metano por kilo producido.' },
    en: { title: 'Low-emission cattle genetics', body: 'A breeding programme offers animals that emit less methane per kilo produced.' },
    options: [
      { id: 'adopt', es: 'Financiar el plan de mejoramiento', en: 'Fund the breeding plan', cost: 150, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'Dejarlo al sector privado', en: 'Leave it to the private sector', effects: [] },
    ],
  },
  {
    id: 'university-extension', actor: 'science', category: 'technology', tone: 'good', deadline: 6, weight: 3,
    wear: {},
    es: { title: 'La universidad ofrece extensión rural', body: 'Quieren poner equipos técnicos en el territorio si la región pone el transporte.' },
    en: { title: 'The university offers rural extension', body: 'They will put technical teams in the field if the region covers transport.' },
    options: [
      { id: 'fund', es: 'Poner el transporte', en: 'Cover the transport', cost: 60, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'No hay presupuesto', en: 'No budget for it', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'solar-pumping', actor: 'industry', category: 'technology', tone: 'good', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Bombeo solar para riego', body: 'Reemplazar bombas diésel por solares baja costos y emisiones, pero necesita inversión inicial.' },
    en: { title: 'Solar pumping for irrigation', body: 'Replacing diesel pumps with solar cuts costs and emissions, but needs upfront investment.' },
    options: [
      { id: 'fund', es: 'Financiar el recambio', en: 'Fund the replacement', cost: 170, effects: [{ landUseChange: { target: LandUseType.EnergyPark, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Dejarlo para otra gestión', en: 'Leave it to another administration', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'food-waste', actor: 'citizen', category: 'production', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppSocial: 0.2 },
    es: { title: 'Se tira comida en buen estado', body: 'Supermercados descartan alimentos que podrían ir a comedores. Falta un marco legal.' },
    en: { title: 'Edible food is being thrown out', body: 'Supermarkets discard food that could go to community kitchens. There is no legal framework.' },
    options: [
      { id: 'law', es: 'Ley de donación con incentivo fiscal', en: 'Donation law with a tax incentive', effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -40 }] },
      { id: 'ignore', es: 'No legislar', en: 'Do not legislate', effects: [{ indicator: 'stella.PP_SOCIAL', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'traceability-platform', actor: 'industry', category: 'technology', tone: 'neutral', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'Plataforma de trazabilidad regional', body: 'La agroindustria propone una plataforma común de trazabilidad, con costo compartido.' },
    en: { title: 'Regional traceability platform', body: 'Agro-industry proposes a shared traceability platform, with shared cost.' },
    options: [
      { id: 'join', es: 'Participar y exigir datos abiertos', en: 'Join and require open data', cost: 100, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -3 }] },
      { id: 'ignore', es: 'Dejar que la haga el sector', en: 'Let the sector build it alone', effects: [{ indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
    ],
  },
];
