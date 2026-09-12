/**
 * Situations: society and politics (25).
 */
import { LandUseType } from '../../types';
import type { SituationDef } from './types';

export const SOCIETY_SITUATIONS: SituationDef[] = [
  {
    id: 'road-blockade', actor: 'farmer', category: 'politics', tone: 'bad', deadline: 2, weight: 4,
    when: (s) => s.indicators.ppAgricola > 55,
    wear: { ppAgricola: 0.6, conflict: 0.6 },
    es: { title: 'Corte de ruta del sector agropecuario', body: 'Productores bloquean el acceso a la capital regional contra las medidas ambientales.' },
    en: { title: 'Farm-sector road blockade', body: 'Farmers are blocking access to the regional capital against environmental measures.' },
    options: [
      { id: 'negotiate', es: 'Abrir una mesa de negociación', en: 'Open negotiations', cost: 60, effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -8 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'concede', es: 'Suspender la medida en disputa', en: 'Suspend the disputed measure', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -12 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 8 }, { indicator: 'biodiversity', changeAbsolute: -1 }] },
      { id: 'ignore', es: 'Sostener la medida y esperar', en: 'Hold the line and wait', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'economicSecurity', changeAbsolute: -1.5 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'climate-march', actor: 'ngo', category: 'politics', tone: 'neutral', deadline: 3, weight: 4,
    when: (s) => s.indicators.ppAmbientalista > 45,
    wear: { ppAmbientalista: 0.5 },
    es: { title: 'Marcha por el clima', body: 'Miles de personas piden metas más ambiciosas y freno al desmonte.' },
    en: { title: 'Climate march', body: 'Thousands are demanding more ambitious targets and an end to clearing.' },
    options: [
      { id: 'commit', es: 'Anunciar una meta de deforestación cero', en: 'Announce a zero-deforestation target', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -10 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'receive', es: 'Recibir a la delegación', en: 'Receive the delegation', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No responder', en: 'Not respond', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'food-prices-protest', actor: 'citizen', category: 'society', tone: 'bad', deadline: 3, weight: 4,
    when: (s) => s.indicators.foodSecurity < 40,
    wear: { ppSocial: 0.7, conflict: 0.5 },
    es: { title: 'Protesta por el precio de los alimentos', body: 'Organizaciones barriales acampan frente a la gobernación: la canasta básica se volvió inalcanzable.' },
    en: { title: 'Protest over food prices', body: 'Neighbourhood organisations are camped outside the government house: the basic basket is out of reach.' },
    options: [
      { id: 'baskets', es: 'Compra pública de alimentos', en: 'Public food purchase', cost: 160, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -7 }] },
      { id: 'price-control', es: 'Control de precios', en: 'Price controls', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'economicSecurity', changeAbsolute: -1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }] },
      { id: 'ignore', es: 'Sostener que es un tema nacional', en: 'Insist it is a national matter', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 7 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 8 }] },
    ],
  },
  {
    id: 'rural-school', actor: 'citizen', category: 'society', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppSocial: 0.3 },
    es: { title: 'Cierra una escuela rural', body: 'Sin alumnos suficientes, la provincia quiere cerrarla. Es lo último que queda en el paraje.' },
    en: { title: 'A rural school is closing', body: 'With too few pupils the province wants to close it. It is the last institution in the hamlet.' },
    options: [
      { id: 'keep', es: 'Sostenerla con fondos regionales', en: 'Keep it open with regional funds', cost: 80, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Aceptar el cierre', en: 'Accept the closure', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'rural-exodus', actor: 'citizen', category: 'society', tone: 'bad', deadline: 6, weight: 3,
    wear: { ppSocial: 0.3, conflict: 0.2 },
    es: { title: 'Se vacía el campo', body: 'El censo muestra que los jóvenes se van. Sin relevo generacional no hay quién trabaje la tierra.' },
    en: { title: 'The countryside is emptying', body: 'The census shows young people leaving. With no generational turnover there is nobody to work the land.' },
    options: [
      { id: 'settle', es: 'Plan de arraigo con tierra y crédito', en: 'Settlement plan with land and credit', cost: 180, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'connectivity', es: 'Internet y caminos rurales', en: 'Rural internet and roads', cost: 120, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'ignore', es: 'Es una tendencia global', en: 'It is a global trend', effects: [{ indicator: 'foodSecurity', changeAbsolute: -1 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'indigenous-consultation', actor: 'citizen', category: 'politics', tone: 'neutral', deadline: 4, weight: 3,
    wear: { ppSocial: 0.4, ppAmbientalista: 0.3 },
    es: { title: 'Reclamo de consulta previa', body: 'Una comunidad indígena exige consulta antes de habilitar obras sobre territorio que ocupa hace generaciones.' },
    en: { title: 'Demand for prior consultation', body: 'An Indigenous community demands consultation before works are approved on land it has held for generations.' },
    options: [
      { id: 'consult', es: 'Abrir la consulta formal', en: 'Open a formal consultation', cost: 70, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -5 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'title', es: 'Reconocer el título comunitario', en: 'Recognise communal title', effects: [{ landUseChange: { target: LandUseType.ProtectedNativeForest, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -5 } }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -7 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
      { id: 'ignore', es: 'Avanzar con las obras', en: 'Push ahead with the works', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 7 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 3 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
    ],
  },
  {
    id: 'rural-wages', actor: 'citizen', category: 'society', tone: 'bad', deadline: 4, weight: 3,
    wear: { ppSocial: 0.5, conflict: 0.3 },
    es: { title: 'Paritaria rural trabada', body: 'Los peones rurales reclaman recomposición salarial. La patronal dice que no hay margen.' },
    en: { title: 'Deadlocked farm-wage talks', body: 'Farm workers demand a pay rise. Employers say there is no room.' },
    options: [
      { id: 'mediate', es: 'Mediar y garantizar un piso', en: 'Mediate and guarantee a floor', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -6 }] },
      { id: 'subsidise', es: 'Subsidiar parte del salario rural', en: 'Subsidise part of the farm wage', cost: 150, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No intervenir en la paritaria', en: 'Stay out of the talks', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'informal-settlement', actor: 'citizen', category: 'society', tone: 'bad', deadline: 5, weight: 2,
    wear: { ppSocial: 0.4, conflict: 0.3 },
    es: { title: 'Toma de tierras en el periurbano', body: 'Familias sin vivienda ocuparon un predio fiscal en el borde del pueblo.' },
    en: { title: 'Land occupation on the urban edge', body: 'Families without housing occupied public land at the edge of town.' },
    options: [
      { id: 'urbanise', es: 'Urbanizar y regularizar', en: 'Urbanise and regularise', cost: 160, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -6 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'relocate', es: 'Relocalizar con acuerdo', en: 'Relocate by agreement', cost: 100, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'evict', es: 'Desalojar', en: 'Evict', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 8 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 3 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 7 }] },
    ],
  },
  {
    id: 'health-post', actor: 'citizen', category: 'society', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppSocial: 0.3 },
    es: { title: 'Sin médico en el paraje', body: 'La salita rural lleva medio año sin profesional de guardia.' },
    en: { title: 'No doctor in the hamlet', body: 'The rural clinic has had no doctor on duty for six months.' },
    options: [
      { id: 'staff', es: 'Incentivo para radicar profesionales', en: 'Incentive to bring in professionals', cost: 110, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -4 }] },
      { id: 'telemedicine', es: 'Telemedicina y rondas mensuales', en: 'Telemedicine and monthly rounds', cost: 50, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'ignore', es: 'Esperar la partida provincial', en: 'Wait for the provincial budget', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'women-cooperatives', actor: 'citizen', category: 'society', tone: 'good', deadline: 5, weight: 3,
    wear: {},
    es: { title: 'Cooperativas de mujeres rurales', body: 'Piden acceso a crédito y a tierra para producir alimentos de cercanía.' },
    en: { title: 'Rural women’s cooperatives', body: 'They are asking for credit and land access to produce local food.' },
    options: [
      { id: 'support', es: 'Línea de crédito y tierra pública', en: 'Credit line and public land', cost: 120, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 4 } }, { landUseChange: { target: LandUseType.GrasslandsPastures, changeAbsolute_kHa: -4 } }] },
      { id: 'ignore', es: 'Derivar a programas nacionales', en: 'Refer them to national programmes', effects: [{ indicator: 'stella.PP_SOCIAL', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'audit-subsidies', actor: 'government', category: 'politics', tone: 'bad', deadline: 3, weight: 3,
    wear: { conflict: 0.4 },
    es: { title: 'Auditoría a los subsidios', body: 'El tribunal de cuentas detecta pagos a beneficiarios que no cumplen los requisitos.' },
    en: { title: 'Audit of the subsidies', body: 'The audit office finds payments to beneficiaries who do not meet the requirements.' },
    options: [
      { id: 'clean', es: 'Depurar el padrón y publicarlo', en: 'Clean the register and publish it', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 90 }, { indicator: 'stella.Colapso_politico', changeAbsolute: -3 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
      { id: 'quiet', es: 'Corregir sin publicidad', en: 'Fix it quietly', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 40 }] },
      { id: 'ignore', es: 'Cuestionar el informe', en: 'Dispute the report', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'corruption-scandal', actor: 'government', category: 'politics', tone: 'bad', deadline: 3, weight: 2,
    wear: { conflict: 0.6, ppSocial: 0.4 },
    es: { title: 'Escándalo por una licitación', body: 'Trascendió que una obra de riego se adjudicó sin competencia a una empresa vinculada.' },
    en: { title: 'Procurement scandal', body: 'An irrigation contract was awarded without competition to a connected company.' },
    options: [
      { id: 'investigate', es: 'Investigar y apartar a los responsables', en: 'Investigate and remove those responsible', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: -4 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'ignore', es: 'Negar y seguir', en: 'Deny it and move on', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 7 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'opposition-motion', actor: 'government', category: 'politics', tone: 'bad', deadline: 3, weight: 3,
    when: (s) => s.indicators.politicalStability < 55,
    wear: { conflict: 0.4 },
    es: { title: 'Moción de censura en la legislatura', body: 'La oposición reúne firmas contra el paquete ambiental.' },
    en: { title: 'No-confidence motion in the legislature', body: 'The opposition is collecting signatures against the environmental package.' },
    options: [
      { id: 'negotiate', es: 'Negociar cediendo una medida', en: 'Negotiate, conceding one measure', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: -5 }, { indicator: 'biodiversity', changeAbsolute: -1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }] },
      { id: 'hold', es: 'Sostener el paquete completo', en: 'Hold the full package', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 4 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }] },
      { id: 'ignore', es: 'Ignorar la moción', en: 'Ignore the motion', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'midterm-elections', actor: 'government', category: 'politics', tone: 'neutral', deadline: 4, weight: 2,
    wear: { conflict: 0.3 },
    es: { title: 'Elecciones de medio término', body: 'La campaña empieza y todo lo que se decida ahora va a discutirse en la calle.' },
    en: { title: 'Midterm elections', body: 'The campaign starts, and everything decided now will be argued in the street.' },
    options: [
      { id: 'defend', es: 'Defender el rumbo ambiental', en: 'Defend the environmental course', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
      { id: 'promise', es: 'Prometer alivio al campo', en: 'Promise relief for the farm sector', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -7 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }] },
      { id: 'quiet', es: 'Bajar el perfil', en: 'Keep a low profile', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'press-investigation', actor: 'government', category: 'politics', tone: 'bad', deadline: 3, weight: 3,
    wear: { conflict: 0.3, ppAmbientalista: 0.3 },
    es: { title: 'Investigación periodística sobre desmonte', body: 'Un medio nacional publica que el desmonte creció bajo esta gestión.' },
    en: { title: 'Press investigation into clearing', body: 'A national outlet reports that clearing grew under this administration.' },
    options: [
      { id: 'data', es: 'Publicar los datos oficiales completos', en: 'Publish the full official data', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: -2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'moratorium', es: 'Anunciar una moratoria de desmonte', en: 'Announce a clearing moratorium', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -8 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 7 }, { indicator: 'biodiversity', changeAbsolute: 1.5 }] },
      { id: 'ignore', es: 'Desmentir sin datos', en: 'Deny it without data', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 4 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'municipal-conflict', actor: 'government', category: 'politics', tone: 'bad', deadline: 4, weight: 2,
    wear: { conflict: 0.3 },
    es: { title: 'Un municipio se planta', body: 'El intendente del sur se niega a aplicar la ordenanza de ordenamiento territorial.' },
    en: { title: 'A municipality digs in', body: 'The southern mayor refuses to apply the land-planning ordinance.' },
    options: [
      { id: 'fund', es: 'Compensar con obra pública', en: 'Compensate with public works', cost: 130, effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: -3 }, { indicator: 'economicSecurity', changeAbsolute: 0.5 }] },
      { id: 'enforce', es: 'Aplicarla por vía judicial', en: 'Enforce it in court', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 3 }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Dejarlo pasar', en: 'Let it slide', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'local-referendum', actor: 'citizen', category: 'politics', tone: 'neutral', deadline: 4, weight: 2,
    wear: { ppSocial: 0.3 },
    es: { title: 'Piden un referéndum local', body: 'Vecinos juntan firmas para que la población decida sobre un proyecto productivo grande.' },
    en: { title: 'Call for a local referendum', body: 'Neighbours are collecting signatures to let the population decide on a large project.' },
    options: [
      { id: 'hold', es: 'Convocarlo', en: 'Call it', cost: 70, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'stella.Colapso_politico', changeAbsolute: -2 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'ignore', es: 'Rechazar la convocatoria', en: 'Refuse it', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 5 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'ngo-lawsuit', actor: 'ngo', category: 'politics', tone: 'bad', deadline: 4, weight: 3,
    when: (s) => s.indicators.biodiversity < 42,
    wear: { ppAmbientalista: 0.5 },
    es: { title: 'Demanda judicial ambiental', body: 'Una ONG demanda a la región por incumplir su propia ley de bosques.' },
    en: { title: 'Environmental lawsuit', body: 'An NGO is suing the region for breaching its own forest law.' },
    options: [
      { id: 'settle', es: 'Acordar un plan de restauración', en: 'Settle with a restoration plan', cost: 150, effects: [{ landUseChange: { target: LandUseType.RestorationForest, changeAbsolute_kHa: 6 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -6 } }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -8 }] },
      { id: 'fight', es: 'Litigar', en: 'Litigate', cost: 60, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
      { id: 'ignore', es: 'No presentarse', en: 'Not show up', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 8 }] },
    ],
  },
  {
    id: 'youth-council', actor: 'citizen', category: 'society', tone: 'good', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Consejo juvenil por el clima', body: 'Estudiantes proponen un consejo consultivo con voz en el plan climático.' },
    en: { title: 'Youth climate council', body: 'Students propose an advisory council with a voice in the climate plan.' },
    options: [
      { id: 'create', es: 'Crearlo con presupuesto propio', en: 'Create it with its own budget', cost: 50, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }] },
      { id: 'ignore', es: 'Agradecer la propuesta', en: 'Thank them for the proposal', effects: [{ indicator: 'stella.PP_SOCIAL', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'transport-strike', actor: 'industry', category: 'society', tone: 'bad', deadline: 2, weight: 3,
    wear: { conflict: 0.5 },
    es: { title: 'Paro de transportistas', body: 'Los camioneros paran por el precio del combustible. No sale ni entra carga.' },
    en: { title: 'Hauliers’ strike', body: 'Truckers stopped over fuel prices. No freight is moving.' },
    options: [
      { id: 'fuel', es: 'Subsidiar el gasoil de carga', en: 'Subsidise freight diesel', cost: 140, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }] },
      { id: 'rail', es: 'Acelerar el plan ferroviario', en: 'Accelerate the rail plan', cost: 180, effects: [{ indicator: 'economicSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Esperar a que se levante', en: 'Wait for it to end', effects: [{ indicator: 'economicSecurity', changeAbsolute: -2 }, { indicator: 'foodSecurity', changeAbsolute: -1.5 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'community-kitchens', actor: 'citizen', category: 'society', tone: 'bad', deadline: 3, weight: 3,
    when: (s) => s.indicators.socialWellbeing < 45,
    wear: { ppSocial: 0.5, conflict: 0.4 },
    es: { title: 'Los comedores no dan abasto', body: 'La demanda en comedores comunitarios creció 30 % en seis meses.' },
    en: { title: 'Community kitchens are overwhelmed', body: 'Demand at community kitchens grew 30% in six months.' },
    options: [
      { id: 'fund', es: 'Reforzar el financiamiento', en: 'Reinforce their funding', cost: 130, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -5 }] },
      { id: 'local', es: 'Abastecerlos con compra a productores locales', en: 'Supply them by buying from local farmers', cost: 150, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No hay partida disponible', en: 'No budget line available', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'foodSecurity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'just-transition-demand', actor: 'citizen', category: 'politics', tone: 'neutral', deadline: 5, weight: 3,
    wear: { ppSocial: 0.4 },
    es: { title: 'Exigen una transición justa', body: 'Los sindicatos piden garantías de empleo antes de cerrar actividades intensivas en carbono.' },
    en: { title: 'Demand for a just transition', body: 'Unions want job guarantees before carbon-intensive activities are closed.' },
    options: [
      { id: 'fund', es: 'Crear el fondo de transición justa', en: 'Create the just-transition fund', cost: 200, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -6 }, { indicator: 'economicSecurity', changeAbsolute: 1 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -7 }] },
      { id: 'training', es: 'Solo capacitación', en: 'Training only', cost: 80, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'ignore', es: 'Seguir sin garantías', en: 'Proceed without guarantees', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 7 }] },
    ],
  },
  {
    id: 'land-registry', actor: 'government', category: 'politics', tone: 'neutral', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'El catastro está desactualizado', body: 'Media región tiene títulos confusos: sin catastro no hay control de uso del suelo.' },
    en: { title: 'The land registry is out of date', body: 'Half the region has muddled titles: with no registry there is no land-use control.' },
    options: [
      { id: 'update', es: 'Actualizarlo con relevamiento satelital', en: 'Update it with satellite survey', cost: 160, effects: [{ indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 60 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
      { id: 'ignore', es: 'Dejarlo como está', en: 'Leave it as it is', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'mayor-alliance', actor: 'government', category: 'politics', tone: 'good', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Intendentes proponen un frente común', body: 'Ocho municipios ofrecen coordinar ordenamiento territorial si la región financia la oficina técnica.' },
    en: { title: 'Mayors propose a common front', body: 'Eight municipalities offer to coordinate land planning if the region funds the technical office.' },
    options: [
      { id: 'fund', es: 'Financiar la oficina', en: 'Fund the office', cost: 90, effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: -4 }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Que lo resuelva cada municipio', en: 'Let each municipality handle it', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'public-hearing', actor: 'citizen', category: 'politics', tone: 'neutral', deadline: 3, weight: 3,
    wear: { ppSocial: 0.3, ppAmbientalista: 0.2 },
    es: { title: 'Audiencia pública por un proyecto', body: 'Una audiencia por un desarrollo grande reúne a favor y en contra en el mismo salón.' },
    en: { title: 'Public hearing on a project', body: 'A hearing on a large development brings supporters and opponents into the same room.' },
    options: [
      { id: 'binding', es: 'Hacerla vinculante', en: 'Make it binding', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -4 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'advisory', es: 'Mantenerla consultiva', en: 'Keep it advisory', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 2 }] },
    ],
  },
];
