/**
 * Situations: economy, finance and international affairs (25).
 */
import { LandUseType } from '../../types';
import type { SituationDef } from './types';

export const ECONOMY_SITUATIONS: SituationDef[] = [
  {
    id: 'recession', actor: 'industry', category: 'economy', tone: 'bad', deadline: 4, weight: 3,
    wear: { conflict: 0.4, ppSocial: 0.3 },
    es: { title: 'Recesión en el principal socio comercial', body: 'Cae la demanda externa. La actividad regional se enfría y la recaudación con ella.' },
    en: { title: 'Recession in the main trading partner', body: 'External demand is falling. Regional activity cools and so does revenue.' },
    options: [
      { id: 'stimulus', es: 'Plan de obra pública anticíclico', en: 'Counter-cyclical public works', cost: 200, effects: [{ indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'austerity', es: 'Ajustar el gasto', en: 'Cut spending', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 120 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 5 }, { indicator: 'economicSecurity', changeAbsolute: -1.5 }] },
      { id: 'ignore', es: 'Esperar el rebote', en: 'Wait for the rebound', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'stella.PBI_Real', changePercentage: -0.015 }] },
    ],
  },
  {
    id: 'inflation-spike', actor: 'citizen', category: 'economy', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppSocial: 0.5, conflict: 0.4 },
    es: { title: 'Salto inflacionario', body: 'Los precios se aceleran y los salarios quedan atrás. El malestar sube rápido.' },
    en: { title: 'Inflation spike', body: 'Prices accelerate and wages fall behind. Discontent rises fast.' },
    options: [
      { id: 'transfer', es: 'Transferencia directa a los hogares', en: 'Direct transfer to households', cost: 180, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -6 }, { indicator: 'foodSecurity', changeAbsolute: 1.5 }] },
      { id: 'ignore', es: 'No compensar', en: 'No compensation', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'foodSecurity', changeAbsolute: -1.5 }] },
    ],
  },
  {
    id: 'credit-rating', actor: 'international', category: 'economy', tone: 'bad', deadline: 4, weight: 2,
    when: (s) => s.stellaSpecificState.Deuda > s.stellaSpecificState.PBI_Real * 0.4,
    wear: { conflict: 0.2 },
    es: { title: 'Revisión de la calificación de deuda', body: 'Una calificadora pone la deuda regional en revisión negativa por el nivel de endeudamiento.' },
    en: { title: 'Debt rating under review', body: 'A rating agency puts the regional debt on negative watch over leverage.' },
    options: [
      { id: 'plan', es: 'Presentar un plan fiscal creíble', en: 'Present a credible fiscal plan', effects: [{ indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -60 }] },
      { id: 'ignore', es: 'No hacer nada', en: 'Do nothing', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'stella.Deuda', changePercentage: 0.03 }] },
    ],
  },
  {
    id: 'green-bond', actor: 'international', category: 'economy', tone: 'good', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Oferta de bono verde', body: 'Un banco de desarrollo ofrece financiamiento barato atado a metas de conservación verificables.' },
    en: { title: 'Green bond on offer', body: 'A development bank offers cheap financing tied to verifiable conservation targets.' },
    options: [
      { id: 'issue', es: 'Emitirlo y comprometer metas', en: 'Issue it and commit to the targets', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 400 }, { indicator: 'stella.Deuda', changeAbsolute: 400 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }] },
      { id: 'ignore', es: 'No endeudarse', en: 'Do not take on debt', effects: [] },
    ],
  },
  {
    id: 'carbon-market', actor: 'international', category: 'international', tone: 'neutral', deadline: 5, weight: 3,
    when: (s) => s.landUses[LandUseType.ProtectedNativeForest].area + s.landUses[LandUseType.RestorationForest].area > 20,
    wear: {},
    es: { title: 'Oferta de créditos de carbono', body: 'Una empresa quiere comprar créditos por el bosque protegido de la región, con contrato a 20 años.' },
    en: { title: 'Carbon credit offer', body: 'A company wants to buy credits for the region’s protected forest, on a 20-year contract.' },
    options: [
      { id: 'sell', es: 'Vender los créditos', en: 'Sell the credits', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 260 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 4 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'community', es: 'Vender con reparto comunitario', en: 'Sell with community revenue sharing', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 160 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'refuse', es: 'Rechazar la venta', en: 'Refuse the sale', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -3 }] },
    ],
  },
  {
    id: 'climate-fund', actor: 'international', category: 'international', tone: 'good', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Fondo climático internacional', body: 'Abre una ventanilla de adaptación. Hay que presentar proyecto y contraparte local.' },
    en: { title: 'International climate fund', body: 'An adaptation window opens. It needs a project and local counterpart funding.' },
    options: [
      { id: 'apply', es: 'Presentar proyecto de adaptación', en: 'Apply with an adaptation project', cost: 80, effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 260 }, { indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No presentarse', en: 'Do not apply', effects: [] },
    ],
  },
  {
    id: 'deforestation-regulation', actor: 'international', category: 'international', tone: 'bad', deadline: 4, weight: 3,
    when: (s) => s.landUses[LandUseType.UnprotectedNativeForest].area < 60,
    wear: { ppAgricola: 0.3, ppAmbientalista: 0.3 },
    es: { title: 'Regulación de deforestación importada', body: 'El principal mercado exigirá probar que la producción no viene de tierra desmontada.' },
    en: { title: 'Imported-deforestation regulation', body: 'The main market will require proof that production does not come from cleared land.' },
    options: [
      { id: 'traceability', es: 'Montar trazabilidad y cumplir', en: 'Build traceability and comply', cost: 170, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
      { id: 'divert', es: 'Redirigir a mercados sin exigencia', en: 'Redirect to markets with no requirement', effects: [{ indicator: 'economicSecurity', changeAbsolute: -1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }] },
      { id: 'ignore', es: 'Esperar y ver', en: 'Wait and see', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'stella.PBI_Real', changePercentage: -0.01 }] },
    ],
  },
  {
    id: 'tariff-war', actor: 'international', category: 'international', tone: 'bad', deadline: 3, weight: 2,
    wear: { ppAgricola: 0.3 },
    es: { title: 'Guerra de aranceles', body: 'Dos potencias se cruzan aranceles y los granos de la región quedan en el medio.' },
    en: { title: 'Tariff war', body: 'Two powers are trading tariffs and the region’s grain is caught in between.' },
    options: [
      { id: 'diversify', es: 'Diversificar destinos', en: 'Diversify destinations', cost: 90, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Mantener el destino de siempre', en: 'Stick with the usual destination', effects: [{ indicator: 'economicSecurity', changeAbsolute: -1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'fdi-offer', actor: 'industry', category: 'economy', tone: 'neutral', deadline: 4, weight: 3,
    wear: {},
    es: { title: 'Oferta de inversión extranjera', body: 'Un fondo quiere instalar una planta de procesamiento a cambio de exenciones por diez años.' },
    en: { title: 'Foreign investment offer', body: 'A fund wants to build a processing plant in exchange for a ten-year tax break.' },
    options: [
      { id: 'accept', es: 'Aceptar con exenciones', en: 'Accept with the tax break', effects: [{ indicator: 'economicSecurity', changeAbsolute: 2.5 }, { indicator: 'stella.PBI_Real', changePercentage: 0.015 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 5 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -60 }] },
      { id: 'negotiate', es: 'Negociar empleo local y estándares', en: 'Negotiate local jobs and standards', effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }] },
      { id: 'refuse', es: 'Rechazar la oferta', en: 'Refuse the offer', effects: [{ indicator: 'economicSecurity', changeAbsolute: -1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -3 }] },
    ],
  },
  {
    id: 'plant-closure', actor: 'industry', category: 'economy', tone: 'bad', deadline: 3, weight: 3,
    when: (s) => s.indicators.economicSecurity < 35,
    wear: { conflict: 0.5, ppSocial: 0.4 },
    es: { title: 'Cierra una planta agroindustrial', body: 'Doscientos empleos en juego en un pueblo de tres mil habitantes.' },
    en: { title: 'An agro-industrial plant is closing', body: 'Two hundred jobs at stake in a town of three thousand.' },
    options: [
      { id: 'rescue', es: 'Rescate con participación pública', en: 'Rescue with a public stake', cost: 220, effects: [{ indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -5 }] },
      { id: 'coop', es: 'Apoyar que la tomen los trabajadores', en: 'Back a worker takeover', cost: 120, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -5 }] },
      { id: 'ignore', es: 'Dejar que cierre', en: 'Let it close', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'tax-evasion', actor: 'government', category: 'economy', tone: 'neutral', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Evasión en la cadena de granos', body: 'Un cruce de datos muestra subdeclaración sistemática de volúmenes exportados.' },
    en: { title: 'Evasion in the grain chain', body: 'A data cross-check shows systematic under-reporting of exported volumes.' },
    options: [
      { id: 'enforce', es: 'Fiscalizar y cobrar', en: 'Audit and collect', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 200 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }] },
      { id: 'amnesty', es: 'Moratoria con pago voluntario', en: 'Amnesty with voluntary payment', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 90 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 3 }] },
      { id: 'ignore', es: 'Dejarlo pasar', en: 'Let it pass', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'energy-tariff', actor: 'citizen', category: 'economy', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppSocial: 0.4 },
    es: { title: 'Aumento de la tarifa eléctrica', body: 'El aumento golpea a hogares y a los tambos, que dependen del frío.' },
    en: { title: 'Electricity tariff increase', body: 'The rise hits households and dairies, which depend on refrigeration.' },
    options: [
      { id: 'shield', es: 'Tarifa social focalizada', en: 'Targeted social tariff', cost: 140, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'renewables', es: 'Acelerar generación propia', en: 'Accelerate own generation', cost: 200, effects: [{ landUseChange: { target: LandUseType.EnergyPark, changeAbsolute_kHa: 10 } }, { landUseChange: { target: LandUseType.GrasslandsPastures, changeAbsolute_kHa: -10 } }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Trasladar el aumento', en: 'Pass the increase through', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 5 }, { indicator: 'economicSecurity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'fuel-subsidy-cut', actor: 'government', category: 'economy', tone: 'neutral', deadline: 4, weight: 3,
    wear: { ppSocial: 0.3 },
    es: { title: 'Presión para quitar subsidios fósiles', body: 'Organismos internacionales condicionan financiamiento al recorte de subsidios a combustibles.' },
    en: { title: 'Pressure to cut fossil subsidies', body: 'International bodies tie financing to cutting fuel subsidies.' },
    options: [
      { id: 'cut-compensate', es: 'Quitarlos y compensar a los hogares', en: 'Cut them and compensate households', cost: 120, effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 180 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 2 }] },
      { id: 'cut', es: 'Quitarlos sin compensación', en: 'Cut them with no compensation', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 260 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 8 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 8 }] },
      { id: 'keep', es: 'Mantenerlos', en: 'Keep them', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -80 }] },
    ],
  },
  {
    id: 'sovereign-fund', actor: 'government', category: 'economy', tone: 'good', deadline: 6, weight: 2,
    when: (s) => s.stellaSpecificState.Reservas_del_Tesoro > 1200,
    wear: {},
    es: { title: 'Excedente fiscal sin destino', body: 'Las reservas acumuladas alcanzan para crear un fondo de largo plazo.' },
    en: { title: 'Fiscal surplus with no destination', body: 'Accumulated reserves are enough to create a long-term fund.' },
    options: [
      { id: 'climate-fund', es: 'Fondo climático regional', en: 'Regional climate fund', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -300 }, { indicator: 'biodiversity', changeAbsolute: 2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }] },
      { id: 'debt', es: 'Cancelar deuda', en: 'Pay down debt', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: -300 }, { indicator: 'stella.Deuda', changeAbsolute: -300 }, { indicator: 'economicSecurity', changeAbsolute: 1.5 }] },
      { id: 'keep', es: 'Mantener las reservas', en: 'Keep the reserves', effects: [] },
    ],
  },
  {
    id: 'insurance-scheme', actor: 'industry', category: 'economy', tone: 'neutral', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Seguro climático agrícola', body: 'Aseguradoras ofrecen cobertura por sequía si la región subsidia la prima de los chicos.' },
    en: { title: 'Agricultural climate insurance', body: 'Insurers offer drought cover if the region subsidises smallholder premiums.' },
    options: [
      { id: 'subsidise', es: 'Subsidiar la prima', en: 'Subsidise the premium', cost: 150, effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -6 }, { indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Dejarlo al mercado', en: 'Leave it to the market', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'summit-invite', actor: 'international', category: 'international', tone: 'neutral', deadline: 4, weight: 3,
    wear: {},
    es: { title: 'Invitación a una cumbre climática', body: 'La región puede presentar su plan ante otras jurisdicciones subnacionales.' },
    en: { title: 'Invitation to a climate summit', body: 'The region can present its plan to other subnational jurisdictions.' },
    options: [
      { id: 'attend', es: 'Ir y comprometer metas', en: 'Attend and commit to targets', cost: 40, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'observe', es: 'Ir como observador', en: 'Attend as an observer', cost: 20, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -2 }] },
      { id: 'skip', es: 'No asistir', en: 'Skip it', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'twin-region', actor: 'international', category: 'international', tone: 'good', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'Hermanamiento con otra región', body: 'Una región de otro continente propone intercambio técnico en restauración.' },
    en: { title: 'Twinning with another region', body: 'A region on another continent proposes technical exchange on restoration.' },
    options: [
      { id: 'sign', es: 'Firmar el acuerdo', en: 'Sign the agreement', cost: 50, effects: [{ indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -3 }] },
      { id: 'ignore', es: 'Agradecer sin firmar', en: 'Decline politely', effects: [] },
    ],
  },
  {
    id: 'certification-scheme', actor: 'international', category: 'international', tone: 'neutral', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Sello de producción sostenible', body: 'Un esquema internacional ofrece sobreprecio por producción certificada, con auditoría anual.' },
    en: { title: 'Sustainable production label', body: 'An international scheme offers a price premium for certified production, with annual audits.' },
    options: [
      { id: 'join', es: 'Adherir y auditar', en: 'Join and audit', cost: 110, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }] },
      { id: 'ignore', es: 'No adherir', en: 'Do not join', effects: [] },
    ],
  },
  {
    id: 'ipcc-report', actor: 'science', category: 'international', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppAmbientalista: 0.2 },
    es: { title: 'Nuevo informe del IPCC', body: 'El informe proyecta menos lluvia y más extremos para esta latitud en las próximas décadas.' },
    en: { title: 'New IPCC report', body: 'The report projects less rainfall and more extremes for this latitude in coming decades.' },
    options: [
      { id: 'integrate', es: 'Integrarlo al plan regional', en: 'Build it into the regional plan', cost: 60, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }] },
      { id: 'ignore', es: 'Tomar nota', en: 'Take note', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'migration-inflow', actor: 'citizen', category: 'society', tone: 'neutral', deadline: 5, weight: 2,
    wear: { ppSocial: 0.3, conflict: 0.2 },
    es: { title: 'Llegada de familias desplazadas', body: 'Familias que perdieron su tierra por sequía en otra provincia buscan instalarse acá.' },
    en: { title: 'Displaced families arriving', body: 'Families who lost land to drought in another province want to settle here.' },
    options: [
      { id: 'settle', es: 'Programa de radicación con tierra pública', en: 'Settlement programme on public land', cost: 140, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'ignore', es: 'No hay programa', en: 'No programme', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'water-treaty', actor: 'international', category: 'international', tone: 'neutral', deadline: 5, weight: 2,
    wear: { ppAmbientalista: 0.2 },
    es: { title: 'Tratado de cuenca compartida', body: 'La provincia vecina propone repartir el caudal del río con reglas fijas.' },
    en: { title: 'Shared-basin treaty', body: 'The neighbouring province proposes fixed rules for sharing the river flow.' },
    options: [
      { id: 'sign', es: 'Firmar el reparto', en: 'Sign the allocation', effects: [{ indicator: 'foodSecurity', changeAbsolute: -0.5 }, { indicator: 'biodiversity', changeAbsolute: 1.5 }, { indicator: 'stella.Colapso_politico', changeAbsolute: -2 }] },
      { id: 'negotiate', es: 'Negociar más caudal', en: 'Negotiate for more flow', cost: 60, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
      { id: 'ignore', es: 'No firmar', en: 'Do not sign', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 3 }, { indicator: 'biodiversity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'tech-transfer', actor: 'international', category: 'international', tone: 'good', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Transferencia de tecnología limpia', body: 'Un programa ofrece equipamiento de riego y energía a cambio de datos de desempeño.' },
    en: { title: 'Clean technology transfer', body: 'A programme offers irrigation and energy equipment in exchange for performance data.' },
    options: [
      { id: 'accept', es: 'Aceptar el programa', en: 'Accept the programme', effects: [{ landUseChange: { target: LandUseType.EnergyPark, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Declinar', en: 'Decline', effects: [] },
    ],
  },
  {
    id: 'ngo-funding', actor: 'ngo', category: 'international', tone: 'good', deadline: 4, weight: 2,
    wear: {},
    es: { title: 'Financiamiento para monitoreo comunitario', body: 'Una fundación financia guardaparques comunitarios si la región aporta la coordinación.' },
    en: { title: 'Funding for community monitoring', body: 'A foundation will fund community rangers if the region provides coordination.' },
    options: [
      { id: 'accept', es: 'Aceptar y coordinar', en: 'Accept and coordinate', cost: 50, effects: [{ indicator: 'biodiversity', changeAbsolute: 1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No hay personal para coordinar', en: 'No staff to coordinate', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'land-grab', actor: 'international', category: 'economy', tone: 'bad', deadline: 4, weight: 2,
    wear: { ppSocial: 0.3, ppAgricola: 0.2 },
    es: { title: 'Compra extranjera de tierras', body: 'Un fondo soberano quiere comprar 40.000 hectáreas productivas para exportar a su país.' },
    en: { title: 'Foreign land purchase', body: 'A sovereign fund wants to buy 40,000 productive hectares to export to its own country.' },
    options: [
      { id: 'block', es: 'Bloquear la operación', en: 'Block the deal', effects: [{ indicator: 'foodSecurity', changeAbsolute: 1 }, { indicator: 'economicSecurity', changeAbsolute: -1 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -5 }] },
      { id: 'condition', es: 'Autorizar con cupo de abastecimiento local', en: 'Authorise with a local-supply quota', effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 120 }] },
      { id: 'allow', es: 'Autorizar sin condiciones', en: 'Authorise with no conditions', effects: [{ indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'foodSecurity', changeAbsolute: -2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 5 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'debt-swap', actor: 'international', category: 'international', tone: 'good', deadline: 5, weight: 2,
    when: (s) => s.stellaSpecificState.Deuda > 500,
    wear: {},
    es: { title: 'Canje de deuda por naturaleza', body: 'Acreedores ofrecen perdonar parte de la deuda a cambio de conservación verificable.' },
    en: { title: 'Debt-for-nature swap', body: 'Creditors offer to forgive part of the debt in exchange for verifiable conservation.' },
    options: [
      { id: 'swap', es: 'Aceptar el canje', en: 'Accept the swap', effects: [{ indicator: 'stella.Deuda', changeAbsolute: -350 }, { landUseChange: { target: LandUseType.ProtectedNativeForest, changeAbsolute_kHa: 10 } }, { landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -10 } }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
      { id: 'refuse', es: 'Rechazarlo por condicionalidad', en: 'Refuse it over the conditionality', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'research-station', actor: 'science', category: 'international', tone: 'good', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'Estación de investigación regional', body: 'Un consorcio internacional propone instalar una estación de monitoreo del nexo agua-carbono.' },
    en: { title: 'Regional research station', body: 'An international consortium proposes a monitoring station for the water-carbon nexus.' },
    options: [
      { id: 'host', es: 'Alojarla y aportar terreno', en: 'Host it and provide land', cost: 70, effects: [{ indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No hay terreno disponible', en: 'No land available', effects: [] },
    ],
  },
];
