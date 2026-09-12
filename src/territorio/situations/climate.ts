/**
 * Situations: climate, water and ecology (25). Effects are written in the model's own variables.
 * Costs are in the same units as Reservas_del_Tesoro (level 2 starts at 1.000 and collects ~1.500/año).
 */
import { LandUseType } from '../../types';
import type { SituationDef } from './types';

export const CLIMATE_SITUATIONS: SituationDef[] = [
  {
    id: 'drought-season', actor: 'farmer', category: 'climate', tone: 'bad', deadline: 4, weight: 5,
    wear: { ppAgricola: 0.6, conflict: 0.3 },
    es: { title: 'Sequía en la cuenca alta', body: 'Tres meses sin lluvias útiles. Los productores piden asistencia y los pozos de la zona norte ya no dan abasto.' },
    en: { title: 'Drought in the upper basin', body: 'Three months without useful rain. Farmers are asking for help and the northern wells are running dry.' },
    options: [
      { id: 'fund', es: 'Fondo de emergencia hídrica', en: 'Emergency water fund', cost: 140, effects: [{ indicator: 'foodSecurity', changeAbsolute: 2.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 }] },
      { id: 'ration', es: 'Racionar el riego', en: 'Ration irrigation', effects: [{ indicator: 'foodSecurity', changeAbsolute: -2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Esperar a que llueva', en: 'Wait for rain', effects: [{ indicator: 'foodSecurity', changePercentage: -0.06 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 7 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'heatwave', actor: 'citizen', category: 'climate', tone: 'bad', deadline: 3, weight: 4,
    wear: { ppSocial: 0.5, conflict: 0.4 },
    es: { title: 'Ola de calor de dos semanas', body: 'Récords de temperatura, cortes de luz en los pueblos y golpes de calor entre los peones rurales.' },
    en: { title: 'Two-week heat wave', body: 'Record temperatures, power cuts in the towns and heat strokes among farm workers.' },
    options: [
      { id: 'shelters', es: 'Centros de refresco y turnos protegidos', en: 'Cooling centres and shaded shifts', cost: 90, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'No hacer nada específico', en: 'Take no specific action', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 5 }, { indicator: 'economicSecurity', changeAbsolute: -1.5 }] },
    ],
  },
  {
    id: 'flood-lowlands', actor: 'citizen', category: 'climate', tone: 'bad', deadline: 3, weight: 4,
    wear: { ppSocial: 0.4, conflict: 0.5 },
    es: { title: 'Inundación en la zona baja', body: 'El río se salió de cauce. Hay familias evacuadas y campo anegado aguas abajo del pueblo.' },
    en: { title: 'Flooding in the lowlands', body: 'The river broke its banks. Families were evacuated and fields downstream of the town are under water.' },
    options: [
      { id: 'relief', es: 'Asistencia y obras de contención', en: 'Relief and containment works', cost: 180, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'economicSecurity', changeAbsolute: -1 }] },
      { id: 'wetland', es: 'Recuperar el humedal como amortiguador', en: 'Restore the wetland as a buffer', cost: 120, effects: [{ landUseChange: { target: LandUseType.PublicWetland, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }] },
      { id: 'ignore', es: 'Dejar que baje el agua', en: 'Let the water recede', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'foodSecurity', changeAbsolute: -2 }] },
    ],
  },
  {
    id: 'hail-storm', actor: 'farmer', category: 'climate', tone: 'bad', deadline: 2, weight: 3,
    wear: { ppAgricola: 0.5 },
    es: { title: 'Granizo sobre la franja frutícola', body: 'Una tormenta arrasó huertas y frutales enteros a horas de la cosecha.' },
    en: { title: 'Hail over the orchard belt', body: 'A storm flattened orchards hours before harvest.' },
    options: [
      { id: 'insurance', es: 'Activar el seguro agrícola público', en: 'Trigger the public crop insurance', cost: 130, effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -6 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Sin compensación', en: 'No compensation', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'foodSecurity', changeAbsolute: -1.5 }] },
    ],
  },
  {
    id: 'late-frost', actor: 'farmer', category: 'climate', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppAgricola: 0.4 },
    es: { title: 'Helada tardía', body: 'Una helada fuera de estación quemó la floración en media región.' },
    en: { title: 'Late frost', body: 'An out-of-season frost burned the blossom across half the region.' },
    options: [
      { id: 'seed', es: 'Repartir semilla para resiembra', en: 'Distribute seed for replanting', cost: 80, effects: [{ indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -3 }] },
      { id: 'ignore', es: 'Asumir la pérdida', en: 'Absorb the loss', effects: [{ indicator: 'foodSecurity', changeAbsolute: -2.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'wildfire', actor: 'ngo', category: 'ecology', tone: 'bad', deadline: 2, weight: 4,
    wear: { ppAmbientalista: 0.7, conflict: 0.2 },
    when: (s) => s.landUses[LandUseType.UnprotectedNativeForest].area > 10,
    es: { title: 'Incendio forestal', body: 'El fuego avanza sobre bosque nativo sin protección. Los brigadistas piden aviones hidrantes.' },
    en: { title: 'Forest fire', body: 'Fire is advancing on unprotected native forest. Crews are asking for water bombers.' },
    options: [
      { id: 'fight', es: 'Desplegar todo el operativo', en: 'Deploy the full operation', cost: 200, effects: [{ indicator: 'biodiversity', changeAbsolute: -1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -8 }] },
      { id: 'partial', es: 'Contener solo cerca de los pueblos', en: 'Contain only near the towns', cost: 70, effects: [{ landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -6 } }, { indicator: 'biodiversity', changeAbsolute: -2.5 }] },
      { id: 'ignore', es: 'Dejar que se apague solo', en: 'Let it burn out', effects: [{ landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -12 } }, { indicator: 'biodiversity', changeAbsolute: -4 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 10 }] },
    ],
  },
  {
    id: 'aquifer-drop', actor: 'science', category: 'climate', tone: 'bad', deadline: 6, weight: 3,
    wear: { ppAmbientalista: 0.3, ppAgricola: 0.3 },
    es: { title: 'El acuífero bajó dos metros', body: 'El monitoreo hidrogeológico muestra descenso sostenido de las napas bajo la zona de riego.' },
    en: { title: 'The aquifer dropped two metres', body: 'Hydrogeological monitoring shows a sustained decline under the irrigated belt.' },
    options: [
      { id: 'quota', es: 'Cupos de extracción por finca', en: 'Per-farm extraction quotas', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -7 }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'recharge', es: 'Obras de recarga gestionada', en: 'Managed recharge works', cost: 160, effects: [{ indicator: 'biodiversity', changeAbsolute: 1.5 }, { indicator: 'economicSecurity', changeAbsolute: -0.5 }] },
      { id: 'ignore', es: 'Seguir como hasta ahora', en: 'Carry on as before', effects: [{ indicator: 'foodSecurity', changeAbsolute: -2 }, { indicator: 'biodiversity', changeAbsolute: -1.5 }] },
    ],
  },
  {
    id: 'urban-water', actor: 'citizen', category: 'climate', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppSocial: 0.6, conflict: 0.4 },
    es: { title: 'Agua racionada en el pueblo', body: 'La planta potabilizadora no da abasto y hay cortes por barrio.' },
    en: { title: 'Rationed water in town', body: 'The treatment plant cannot keep up and neighbourhoods are being cut off.' },
    options: [
      { id: 'plant', es: 'Ampliar la planta', en: 'Expand the plant', cost: 170, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'economicSecurity', changeAbsolute: 1 }] },
      { id: 'trucks', es: 'Camiones cisterna mientras tanto', en: 'Water trucks in the meantime', cost: 60, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -2 }] },
      { id: 'ignore', es: 'Pedir paciencia', en: 'Ask for patience', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'nitrate-pollution', actor: 'science', category: 'ecology', tone: 'bad', deadline: 4, weight: 3,
    when: (s) => s.landUses[LandUseType.ConventionalCrops].area > 80,
    wear: { ppAmbientalista: 0.5, ppSocial: 0.2 },
    es: { title: 'Nitratos por encima del límite', body: 'El agua de red de dos parajes supera el límite de nitratos. La fuente es el escurrimiento agrícola.' },
    en: { title: 'Nitrates above the limit', body: 'Tap water in two hamlets is over the nitrate limit. The source is farm runoff.' },
    options: [
      { id: 'buffers', es: 'Franjas de amortiguación obligatorias', en: 'Mandatory buffer strips', effects: [{ indicator: 'biodiversity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }] },
      { id: 'filters', es: 'Filtros en la red', en: 'Filters on the network', cost: 110, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -3 }] },
      { id: 'ignore', es: 'Revisar el año que viene', en: 'Review it next year', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 7 }, { indicator: 'stella.Conflicto_social', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'good-rains', actor: 'science', category: 'climate', tone: 'good', deadline: 3, weight: 3,
    wear: {},
    es: { title: 'Temporada de lluvias generosa', body: 'El año hidrológico cierra por encima de la media. Hay margen para decidir qué hacer con el excedente.' },
    en: { title: 'A generous rainy season', body: 'The water year closes above average. There is room to decide what to do with the surplus.' },
    options: [
      { id: 'store', es: 'Almacenar y recargar acuíferos', en: 'Store it and recharge aquifers', cost: 60, effects: [{ indicator: 'biodiversity', changeAbsolute: 1 }, { indicator: 'foodSecurity', changeAbsolute: 1 }] },
      { id: 'expand', es: 'Habilitar más superficie de riego', en: 'Open up more irrigated land', effects: [{ indicator: 'foodSecurity', changeAbsolute: 2.5 }, { indicator: 'biodiversity', changeAbsolute: -1.5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'nothing', es: 'No hacer nada especial', en: 'Do nothing in particular', effects: [{ indicator: 'foodSecurity', changeAbsolute: 0.5 }] },
    ],
  },
  {
    id: 'dust-storms', actor: 'farmer', category: 'climate', tone: 'bad', deadline: 4, weight: 2,
    wear: { ppAgricola: 0.4, ppAmbientalista: 0.2 },
    es: { title: 'Tormentas de polvo', body: 'El suelo desnudo entre cosechas vuela con el viento. Se pierde la capa fértil.' },
    en: { title: 'Dust storms', body: 'Bare soil between harvests is blowing away. The fertile layer is going with it.' },
    options: [
      { id: 'cover', es: 'Programa de cultivos de cobertura', en: 'Cover-crop programme', cost: 100, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'ignore', es: 'Es un problema de cada campo', en: "It is each farm's problem", effects: [{ indicator: 'foodSecurity', changeAbsolute: -1.5 }, { indicator: 'biodiversity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'glacier-retreat', actor: 'science', category: 'climate', tone: 'neutral', deadline: 8, weight: 2,
    wear: { ppAmbientalista: 0.2 },
    es: { title: 'Menos reserva de nieve', body: 'El deshielo que alimenta al río llega antes y dura menos. El caudal de verano se achica cada década.' },
    en: { title: 'Less snow reserve', body: 'The melt that feeds the river arrives earlier and lasts less. Summer flow shrinks every decade.' },
    options: [
      { id: 'plan', es: 'Plan de adaptación de cuenca', en: 'Basin adaptation plan', cost: 140, effects: [{ indicator: 'economicSecurity', changeAbsolute: -0.5 }, { indicator: 'foodSecurity', changeAbsolute: 1.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }] },
      { id: 'ignore', es: 'Es un problema de largo plazo', en: 'It is a long-term problem', effects: [{ indicator: 'foodSecurity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'invasive-species', actor: 'ngo', category: 'ecology', tone: 'bad', deadline: 5, weight: 3,
    wear: { ppAmbientalista: 0.4 },
    es: { title: 'Avanza una especie invasora', body: 'Una leñosa exótica coloniza los bordes del bosque nativo y desplaza el sotobosque.' },
    en: { title: 'An invasive species is spreading', body: 'An exotic woody plant is colonising the native forest edges and displacing the understorey.' },
    options: [
      { id: 'control', es: 'Campaña de control y restauración', en: 'Control and restoration campaign', cost: 120, effects: [{ indicator: 'biodiversity', changeAbsolute: 2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }] },
      { id: 'ignore', es: 'Dejar que la naturaleza se acomode', en: 'Let nature sort it out', effects: [{ indicator: 'biodiversity', changeAbsolute: -2.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'pollinator-crash', actor: 'science', category: 'ecology', tone: 'bad', deadline: 4, weight: 3,
    when: (s) => s.indicators.biodiversity < 45,
    wear: { ppAmbientalista: 0.4, ppAgricola: 0.2 },
    es: { title: 'Caen las colmenas', body: 'Los apicultores reportan pérdidas del 40 %. Sin polinizadores, caen frutales y forrajeras.' },
    en: { title: 'Beehives are collapsing', body: 'Beekeepers report 40% losses. Without pollinators, orchards and forage crops fall with them.' },
    options: [
      { id: 'habitat', es: 'Refugios y corredores para polinizadores', en: 'Pollinator refuges and corridors', cost: 110, effects: [{ indicator: 'biodiversity', changeAbsolute: 2.5 }, { indicator: 'foodSecurity', changeAbsolute: 1 }] },
      { id: 'pesticide', es: 'Restringir pesticidas en floración', en: 'Restrict pesticides during bloom', effects: [{ indicator: 'biodiversity', changeAbsolute: 2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
      { id: 'ignore', es: 'Esperar a la próxima temporada', en: 'Wait for next season', effects: [{ indicator: 'biodiversity', changeAbsolute: -2 }, { indicator: 'foodSecurity', changeAbsolute: -2 }] },
    ],
  },
  {
    id: 'illegal-logging', actor: 'ngo', category: 'ecology', tone: 'bad', deadline: 3, weight: 4,
    when: (s) => s.landUses[LandUseType.UnprotectedNativeForest].area > 15,
    wear: { ppAmbientalista: 0.6 },
    es: { title: 'Tala ilegal en el norte', body: 'Imágenes satelitales muestran desmonte fuera de todo permiso, sobre bosque sin protección.' },
    en: { title: 'Illegal logging in the north', body: 'Satellite images show clearing with no permit at all, on unprotected forest.' },
    options: [
      { id: 'enforce', es: 'Operativo y multas ejemplares', en: 'Raid and exemplary fines', cost: 90, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -7 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 40 }] },
      { id: 'protect', es: 'Declarar el área protegida', en: 'Declare the area protected', cost: 150, effects: [{ landUseChange: { target: LandUseType.ProtectedNativeForest, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -5 } }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -8 }] },
      { id: 'ignore', es: 'No hay recursos para llegar', en: 'There are no resources to get there', effects: [{ landUseChange: { target: LandUseType.UnprotectedNativeForest, changeAbsolute_kHa: -8 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: 8 } }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 9 }] },
    ],
  },
  {
    id: 'wetland-drained', actor: 'ngo', category: 'ecology', tone: 'bad', deadline: 3, weight: 3,
    wear: { ppAmbientalista: 0.5 },
    es: { title: 'Drenaron un humedal', body: 'Una empresa canalizó un bajo inundable para sumarlo a la siembra. La denuncia ya es pública.' },
    en: { title: 'A wetland was drained', body: 'A company channelled a floodplain to add it to the planting area. The complaint is already public.' },
    options: [
      { id: 'restore', es: 'Ordenar la restauración a costa del infractor', en: 'Order restoration at the offender’s cost', effects: [{ landUseChange: { target: LandUseType.PublicWetland, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -8 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
      { id: 'fine', es: 'Multar y dejarlo como está', en: 'Fine them and leave it as is', effects: [{ indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 60 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 3 }] },
      { id: 'ignore', es: 'Archivar la denuncia', en: 'Shelve the complaint', effects: [{ indicator: 'biodiversity', changeAbsolute: -2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 8 }, { indicator: 'stella.Colapso_politico', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'corridor-proposal', actor: 'science', category: 'ecology', tone: 'neutral', deadline: 6, weight: 3,
    wear: { ppAmbientalista: 0.2 },
    es: { title: 'Proponen un corredor biológico', body: 'La universidad presenta un trazado para conectar los dos parches de bosque que quedaron aislados.' },
    en: { title: 'A biological corridor is proposed', body: 'The university presents a route connecting the two forest patches left isolated.' },
    options: [
      { id: 'adopt', es: 'Adoptar el trazado', en: 'Adopt the route', cost: 130, effects: [{ indicator: 'biodiversity', changeAbsolute: 3 }, { indicator: 'foodSecurity', changeAbsolute: -0.5 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }] },
      { id: 'study', es: 'Pedir más estudios', en: 'Ask for more studies', cost: 30, effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 2 }] },
      { id: 'reject', es: 'Descartarlo', en: 'Drop it', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -3 }] },
    ],
  },
  {
    id: 'fauna-conflict', actor: 'farmer', category: 'ecology', tone: 'bad', deadline: 4, weight: 2,
    wear: { ppAgricola: 0.4 },
    es: { title: 'Conflicto con fauna silvestre', body: 'Pumas y jabalíes bajan a los campos. Los productores piden autorización para cazarlos.' },
    en: { title: 'Conflict with wildlife', body: 'Pumas and wild boar are coming down into the fields. Farmers want permission to hunt them.' },
    options: [
      { id: 'compensate', es: 'Compensar pérdidas y financiar cercos', en: 'Compensate losses and fund fencing', cost: 90, effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -5 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }] },
      { id: 'cull', es: 'Autorizar el control poblacional', en: 'Authorise population control', effects: [{ indicator: 'biodiversity', changeAbsolute: -2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -6 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 7 }] },
      { id: 'ignore', es: 'No intervenir', en: 'Stay out of it', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: 5 }] },
    ],
  },
  {
    id: 'soil-degradation', actor: 'science', category: 'ecology', tone: 'bad', deadline: 6, weight: 3,
    when: (s) => s.landUses[LandUseType.ConventionalCrops].area > 100,
    wear: { ppAgricola: 0.2, ppAmbientalista: 0.3 },
    es: { title: 'Los suelos pierden materia orgánica', body: 'El muestreo decenal confirma caída de carbono orgánico en la franja de cultivo continuo.' },
    en: { title: 'Soils are losing organic matter', body: 'The ten-year sampling confirms falling organic carbon across the continuous-cropping belt.' },
    options: [
      { id: 'rotation', es: 'Obligar rotación con pasturas', en: 'Require rotation with pasture', effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 8 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -8 } }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }] },
      { id: 'incentive', es: 'Pagar por carbono en suelo', en: 'Pay for soil carbon', cost: 160, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -5 } }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Dejarlo para la próxima gestión', en: 'Leave it to the next administration', effects: [{ indicator: 'foodSecurity', changeAbsolute: -1.5 }, { indicator: 'biodiversity', changeAbsolute: -1 }] },
    ],
  },
  {
    id: 'river-fish', actor: 'citizen', category: 'ecology', tone: 'bad', deadline: 3, weight: 2,
    wear: { ppSocial: 0.3, ppAmbientalista: 0.3 },
    es: { title: 'Mortandad de peces', body: 'Aparecieron peces muertos aguas abajo de la agroindustria. Los pescadores cortaron el muelle.' },
    en: { title: 'Fish die-off', body: 'Dead fish appeared downstream of the agro-industry plant. Fishers blocked the dock.' },
    options: [
      { id: 'inspect', es: 'Inspección y clausura preventiva', en: 'Inspection and preventive closure', effects: [{ indicator: 'economicSecurity', changeAbsolute: -1 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }] },
      { id: 'compensate', es: 'Compensar a los pescadores', en: 'Compensate the fishers', cost: 70, effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Esperar el peritaje', en: 'Wait for the expert report', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 4 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'protected-area-pressure', actor: 'industry', category: 'ecology', tone: 'bad', deadline: 5, weight: 3,
    when: (s) => s.landUses[LandUseType.ProtectedNativeForest].area > 10,
    wear: { ppAgricola: 0.3 },
    es: { title: 'Presión para desafectar un área protegida', body: 'Un grupo inversor pide recategorizar una reserva para uso productivo. Ofrece obras a cambio.' },
    en: { title: 'Pressure to declassify a protected area', body: 'An investor group wants a reserve recategorised for production, offering infrastructure in exchange.' },
    options: [
      { id: 'refuse', es: 'Rechazar y ratificar la protección', en: 'Refuse and reaffirm protection', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -6 }, { indicator: 'economicSecurity', changeAbsolute: -1 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 4 }] },
      { id: 'accept', es: 'Aceptar la recategorización', en: 'Accept the recategorisation', effects: [{ landUseChange: { target: LandUseType.ProtectedNativeForest, changeAbsolute_kHa: -5 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: 5 } }, { indicator: 'economicSecurity', changeAbsolute: 2 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 10 }] },
      { id: 'ignore', es: 'No responder', en: 'Not respond', effects: [{ indicator: 'stella.Colapso_politico', changeAbsolute: 2 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 3 }] },
    ],
  },
  {
    id: 'community-restoration', actor: 'citizen', category: 'ecology', tone: 'good', deadline: 4, weight: 3,
    wear: {},
    es: { title: 'Vivero comunitario listo para plantar', body: 'Una cooperativa de mujeres rurales produjo 200.000 plantines nativos y ofrece la mano de obra.' },
    en: { title: 'Community nursery ready to plant', body: 'A rural women’s cooperative grew 200,000 native seedlings and is offering the labour.' },
    options: [
      { id: 'fund', es: 'Financiar la plantación', en: 'Fund the planting', cost: 90, effects: [{ landUseChange: { target: LandUseType.RestorationForest, changeAbsolute_kHa: 5 } }, { landUseChange: { target: LandUseType.GrasslandsPastures, changeAbsolute_kHa: -5 } }, { indicator: 'stella.Conflicto_social', changeAbsolute: -3 }, { indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -4 }] },
      { id: 'ignore', es: 'Agradecer sin fondos', en: 'Thank them without funding', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 2 }] },
    ],
  },
  {
    id: 'satellite-monitoring', actor: 'science', category: 'ecology', tone: 'neutral', deadline: 6, weight: 2,
    wear: {},
    es: { title: 'Ofrecen monitoreo satelital gratuito', body: 'Una agencia espacial ofrece imágenes mensuales de cobertura si la región publica los datos.' },
    en: { title: 'Free satellite monitoring on offer', body: 'A space agency offers monthly land-cover imagery if the region publishes the data.' },
    options: [
      { id: 'accept', es: 'Aceptar y publicar', en: 'Accept and publish', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: -5 }, { indicator: 'biodiversity', changeAbsolute: 0.5 }] },
      { id: 'decline', es: 'Declinar por soberanía de datos', en: 'Decline on data-sovereignty grounds', effects: [{ indicator: 'stella.PP_AMBIENTALISTA', changeAbsolute: 4 }] },
    ],
  },
  {
    id: 'pesticide-drift', actor: 'citizen', category: 'ecology', tone: 'bad', deadline: 3, weight: 3,
    when: (s) => s.landUses[LandUseType.ConventionalCrops].area > 90,
    wear: { ppSocial: 0.5, ppAmbientalista: 0.3 },
    es: { title: 'Deriva de agroquímicos sobre una escuela', body: 'Una fumigación alcanzó una escuela rural. Hay chicos con síntomas y la comunidad está movilizada.' },
    en: { title: 'Pesticide drift over a school', body: 'A spraying run reached a rural school. Children have symptoms and the community is mobilised.' },
    options: [
      { id: 'buffer', es: 'Distancia mínima obligatoria', en: 'Mandatory minimum distance', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -5 }, { indicator: 'stella.PP_AGRICOLA', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: -5 }] },
      { id: 'fine', es: 'Multa al aplicador', en: 'Fine the applicator', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: -2 }, { indicator: 'stella.Reservas_del_Tesoro', changeAbsolute: 25 }] },
      { id: 'ignore', es: 'Esperar la pericia', en: 'Wait for the expert report', effects: [{ indicator: 'stella.Conflicto_social', changeAbsolute: 6 }, { indicator: 'stella.PP_SOCIAL', changeAbsolute: 6 }] },
    ],
  },
  {
    id: 'carbon-soil-study', actor: 'science', category: 'ecology', tone: 'good', deadline: 5, weight: 2,
    wear: {},
    es: { title: 'Resultados del ensayo de carbono en suelo', body: 'Diez años de parcelas experimentales muestran cuánto carbono retiene cada manejo. Falta decidir qué hacer con eso.' },
    en: { title: 'Soil-carbon trial results', body: 'Ten years of experimental plots show how much carbon each practice retains. What to do with that is still open.' },
    options: [
      { id: 'extend', es: 'Extender el manejo ganador', en: 'Roll out the winning practice', cost: 120, effects: [{ landUseChange: { target: LandUseType.AgroecologicalCrops, changeAbsolute_kHa: 6 } }, { landUseChange: { target: LandUseType.ConventionalCrops, changeAbsolute_kHa: -6 } }, { indicator: 'biodiversity', changeAbsolute: 1 }] },
      { id: 'publish', es: 'Publicar y dejarlo a criterio de cada productor', en: 'Publish and leave it to each farmer', effects: [{ indicator: 'stella.PP_AGRICOLA', changeAbsolute: -2 }] },
    ],
  },
];
