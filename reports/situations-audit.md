# Auditoría del catálogo de situaciones (fase 47)

Generado por `npx tsx scripts/situations-audit.ts` (mejora-general/files/47 §4). Para cada opción: 24 meses desde el
estado inicial de Territorio con la opción aplicada contra los mismos 24 meses sin ella (semilla 47, sin eventos
aleatorios ni choques de rendimiento, sin otras situaciones ni desgaste). Índice I = 0,25·(ΔB + ΔF + ΔE + ΔW) promediado
sobre los 24 meses (los impulsos decaen con vida media de 18 meses); costo neto = costo − efectos inmediatos sobre
reservas y deuda (unidades del tesoro). `*` = opción por defecto (la última; la que se aplica si nadie decide).
Umbral de igualdad: 0.05 puntos.

## Resumen

- Situaciones: 101; opciones: 258.
- Opciones dominantes (mejor índice y menor costo neto que todas las demás de su situación, sin peor estabilidad ni
  presiones que ninguna): **4** (justificadas: 4).
- Defaults que convienen (mejor índice que otra opción que no compensa con estabilidad, presiones ni dinero): **0**.
- Opciones (no default) con efecto total nulo (índice, estabilidad y presiones): **0**.

El índice de la spec no mira la estabilidad política ni las presiones sectoriales; una opción que gana en índice y costo
a cambio de presión o estabilidad es una decisión, no un atajo: se lista en "Compromisos" y no cuenta como marca.

## Marcas

| Situación | Marca | Justificación |
|---|---|---|
| `satellite-monitoring` | dominante: accept | dos opciones: la alternativa es no decidir (el default), que debe ser la peor; ganar es atender el escritorio (oferta gratuita) |
| `corruption-scandal` | dominante: investigate | dos opciones: la alternativa es no decidir (el default), que debe ser la peor; ganar es atender el escritorio (investigar o negar) |
| `public-hearing` | dominante: binding | dos opciones: la alternativa es no decidir (el default), que debe ser la peor; ganar es atender el escritorio (vinculante o consultiva) |
| `climate-fund` | dominante: apply | dos opciones: la alternativa es no decidir (el default), que debe ser la peor; ganar es atender el escritorio (oportunidad: el costo de ignorarla es perderla) |

## Compromisos (ganan en índice y costo, o el default gana en índice, pero pagan fuera de él)

| Situación | Compromiso |
|---|---|
| `aquifer-drop` | quota gana en índice y costo, a cambio de: πa +2.04 / πa +2.00 |
| `fauna-conflict` | default ignore supera a cull en índice, pero es peor en: πa +2.76 |
| `protected-area-pressure` | accept gana en índice y costo, a cambio de: St -0.40, πe +4.31, πs +0.06 / πe +2.88 |
| `seed-sovereignty` | royalties gana en índice y costo, a cambio de: πa +2.80, πs +1.11; default royalties supera a protect en índice, pero es peor en: πa +2.80, πs +1.11 |
| `drone-monitoring` | accept gana en índice y costo, a cambio de: πa +0.46 |
| `climate-march` | commit gana en índice y costo, a cambio de: πa +1.66 / πa +1.66 |
| `rural-wages` | mediate gana en índice y costo, a cambio de: St -0.07, πa +2.04 / πa +1.08 |
| `opposition-motion` | default ignore supera a negotiate en índice, pero es peor en: St -1.92 |
| `press-investigation` | moratorium gana en índice y costo, a cambio de: St -0.34, πa +1.96 / πa +1.96 |
| `recession` | default ignore supera a austerity en índice, pero es peor en: costo +120 |
| `fdi-offer` | negotiate gana en índice y costo, a cambio de: πe +0.74 |
| `fuel-subsidy-cut` | default keep supera a cut en índice, pero es peor en: πe +1.62, costo +340 |
| `land-grab` | condition gana en índice y costo, a cambio de: πs +1.14 |

## Detalle (índice / costo neto / ΔSt medio)

| Situación | Opciones |
|---|---|
| `drought-season` | fund: 0.21 / 140 / 0.1 · ration: -0.13 / 0 / 0.1 · ignore*: -0.39 / 0 / -0.3 |
| `heatwave` | shelters: 0.25 / 90 / 0.2 · ignore*: -0.43 / 0 / -0.3 |
| `flood-lowlands` | relief: 0.24 / 180 / 0.2 · wetland: -0.05 / 120 / 0.2 · ignore*: -0.55 / 0 / -0.3 |
| `hail-storm` | insurance: 0.07 / 130 / 0.1 · ignore*: -0.12 / 0 / -0.1 |
| `late-frost` | seed: 0.12 / 80 / 0.0 · ignore*: -0.20 / 0 / -0.1 |
| `wildfire` | fight: 0.03 / 200 / 0.2 · partial: -0.05 / 70 / 0.0 · ignore*: -0.17 / 0 / -0.3 |
| `aquifer-drop` | quota: 0.09 / 0 / 0.1 · recharge: 0.00 / 160 / -0.0 · ignore*: -0.24 / 0 / -0.0 |
| `urban-water` | plant: 0.39 / 170 / 0.3 · trucks: 0.13 / 60 / 0.1 · ignore*: -0.39 / 0 / -0.3 |
| `nitrate-pollution` | buffers: 0.08 / 0 / 0.1 · filters: 0.19 / 110 / 0.1 · ignore*: -0.25 / 0 / -0.4 |
| `good-rains` | store: 0.11 / 60 / 0.0 · expand: 0.14 / 0 / -0.1 · nothing*: 0.04 / 0 / 0.0 |
| `dust-storms` | cover: 0.08 / 100 / 0.1 · ignore*: -0.15 / 0 / -0.0 |
| `glacier-retreat` | plan: 0.12 / 140 / 0.1 · ignore*: -0.08 / 0 / -0.0 |
| `invasive-species` | control: 0.09 / 120 / 0.1 · ignore*: -0.10 / 0 / -0.2 |
| `pollinator-crash` | habitat: 0.14 / 110 / 0.0 · pesticide: 0.05 / 0 / -0.1 · ignore*: -0.21 / 0 / -0.0 |
| `illegal-logging` | enforce: 0.05 / 50 / 0.2 · protect: 0.06 / 150 / 0.2 · ignore*: 0.08 / 0 / -0.3 |
| `wetland-drained` | restore: -0.04 / 0 / 0.2 · fine: -0.02 / -60 / -0.1 · ignore*: -0.12 / 0 / -0.7 |
| `corridor-proposal` | adopt: 0.08 / 130 / 0.2 · study: -0.02 / 30 / -0.1 · reject*: -0.04 / 0 / -0.1 |
| `fauna-conflict` | compensate: 0.01 / 90 / 0.0 · cull: -0.11 / 0 / -0.2 · ignore*: 0.00 / 0 / -0.1 |
| `soil-degradation` | rotation: 0.08 / 0 / 0.0 · incentive: 0.05 / 160 / 0.1 · ignore*: -0.15 / 0 / -0.0 |
| `river-fish` | inspect: 0.16 / 0 / 0.3 · compensate: 0.25 / 70 / 0.2 · ignore*: -0.31 / 0 / -0.4 |
| `protected-area-pressure` | refuse: -0.03 / 0 / 0.1 · accept: 0.15 / 0 / -0.3 · ignore*: 0.00 / 0 / -0.4 |
| `community-restoration` | fund: 0.14 / 90 / 0.2 · ignore*: -0.13 / 0 / -0.1 |
| `satellite-monitoring` | accept: 0.05 / 0 / 0.1 · decline*: -0.03 / 0 / -0.1 |
| `pesticide-drift` | buffer: 0.31 / 0 / 0.1 · fine: 0.13 / -25 / 0.1 · ignore*: -0.39 / 0 / -0.3 |
| `carbon-soil-study` | extend: 0.09 / 120 / 0.1 · publish*: 0.00 / 0 / 0.0 |
| `pest-outbreak` | emergency: 0.06 / 0 / -0.2 · biological: 0.11 / 120 / 0.0 · ignore*: -0.20 / 0 / -0.1 |
| `locusts` | spray: 0.09 / 130 / 0.0 · ignore*: -0.16 / 0 / -0.1 |
| `foot-and-mouth` | cordon: 0.07 / 200 / 0.1 · deny*: -0.21 / 0 / -0.9 |
| `fertilizer-price` | subsidy: 0.13 / 190 / -0.1 · bioinputs: 0.09 / 150 / 0.1 · ignore*: -0.16 / 0 / -0.1 |
| `bumper-harvest` | reserve: 0.25 / 60 / 0.0 · export: 0.07 / -120 / 0.1 · nothing*: 0.04 / 0 / 0.0 |
| `export-ban` | certify: 0.11 / 140 / 0.1 · redirect: 0.04 / 60 / 0.0 · ignore*: -0.14 / 0 / -0.1 |
| `export-quota` | quota: 0.14 / 0 / -0.1 · targeted: 0.42 / 150 / 0.2 · ignore*: -0.26 / 0 / -0.2 |
| `cold-chain` | upgrade: 0.20 / 110 / 0.0 · solar: 0.03 / 150 / 0.0 · ignore*: -0.19 / 0 / -0.0 |
| `post-harvest-loss` | silos: 0.32 / 140 / 0.1 · ignore*: -0.08 / 0 / -0.0 |
| `dairy-crisis` | price: 0.05 / 170 / 0.1 · silvo: -0.05 / 130 / -0.0 · ignore*: -0.19 / 0 / -0.2 |
| `fishery-collapse` | closure: 0.18 / 120 / 0.1 · ignore*: -0.23 / 0 / -0.2 |
| `agroecology-pilot` | support: 0.08 / 120 / 0.1 · partial: 0.03 / 40 / 0.0 · ignore*: 0.00 / 0 / -0.0 |
| `seed-sovereignty` | protect: 0.05 / 0 / 0.0 · royalties*: 0.11 / 0 / 0.0 |
| `urban-gardens` | grant: 0.32 / 40 / 0.2 · ignore*: -0.13 / 0 / -0.1 |
| `machinery-credit` | green: 0.09 / 0 / 0.0 · open: 0.11 / 0 / -0.0 · ignore*: -0.04 / 0 / -0.0 |
| `biochar-plant` | build: 0.15 / 180 / 0.1 · ignore*: -0.02 / 0 / -0.1 |
| `precision-irrigation` | scale: 0.19 / 160 / 0.1 · pilot: 0.04 / 50 / 0.0 · ignore*: 0.00 / 0 / 0.0 |
| `drone-monitoring` | accept: 0.12 / 0 / 0.0 · ignore*: 0.00 / 0 / 0.0 |
| `gmo-debate` | approve: 0.16 / 0 / -0.1 · conditional: 0.11 / 70 / -0.0 · reject*: 0.04 / 0 / 0.1 |
| `ai-advisory` | public: 0.16 / 90 / 0.0 · ignore*: 0.04 / 0 / 0.0 |
| `genetics-livestock` | adopt: 0.12 / 150 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `university-extension` | fund: 0.09 / 60 / 0.0 · ignore*: 0.00 / 0 / -0.0 |
| `solar-pumping` | fund: 0.01 / 170 / 0.1 · ignore*: -0.02 / 0 / -0.1 |
| `food-waste` | law: 0.35 / 40 / 0.2 · ignore*: 0.00 / 0 / 0.0 |
| `traceability-platform` | join: 0.13 / 100 / 0.1 · ignore*: 0.04 / 0 / 0.0 |
| `road-blockade` | negotiate: 0.25 / 60 / 0.3 · concede: -0.09 / 0 / -0.2 · ignore*: -0.50 / 0 / -0.9 |
| `climate-march` | commit: 0.09 / 0 / 0.2 · receive: 0.03 / 0 / 0.1 · ignore*: -0.24 / 0 / -0.4 |
| `food-prices-protest` | baskets: 0.58 / 160 / 0.3 · price-control: 0.14 / 0 / 0.1 · ignore*: -0.46 / 0 / -0.3 |
| `rural-school` | keep: 0.25 / 80 / 0.2 · ignore*: -0.26 / 0 / -0.2 |
| `rural-exodus` | settle: 0.45 / 180 / 0.2 · connectivity: 0.24 / 120 / 0.1 · ignore*: -0.28 / 0 / -0.2 |
| `indigenous-consultation` | consult: 0.28 / 70 / 0.2 · title: 0.01 / 0 / -0.1 · ignore*: -0.38 / 0 / -0.9 |
| `rural-wages` | mediate: 0.31 / 0 / 0.2 · subsidise: 0.25 / 150 / 0.2 · ignore*: -0.39 / 0 / -0.3 |
| `informal-settlement` | urbanise: 0.41 / 160 / 0.3 · relocate: 0.13 / 100 / 0.1 · evict*: -0.52 / 0 / -0.9 |
| `health-post` | staff: 0.25 / 110 / 0.2 · telemedicine: 0.13 / 50 / 0.1 · ignore*: -0.26 / 0 / -0.2 |
| `women-cooperatives` | support: 0.47 / 120 / 0.2 · ignore*: 0.00 / 0 / 0.0 |
| `audit-subsidies` | clean: 0.00 / -90 / 0.5 · quiet: 0.00 / -40 / 0.0 · ignore*: -0.26 / 0 / -1.2 |
| `corruption-scandal` | investigate: 0.15 / 0 / 0.8 · ignore*: -0.39 / 0 / -1.7 |
| `opposition-motion` | negotiate: -0.07 / 0 / 0.7 · hold: 0.04 / 0 / -0.6 · ignore*: 0.00 / 0 / -1.2 |
| `midterm-elections` | defend: 0.04 / 0 / 0.1 · promise: -0.04 / 0 / -0.1 · quiet*: 0.00 / 0 / -0.4 |
| `press-investigation` | data: 0.03 / 0 / 0.5 · moratorium: 0.09 / 0 / 0.1 · ignore*: -0.05 / 0 / -1.0 |
| `municipal-conflict` | fund: 0.04 / 130 / 0.6 · enforce: 0.02 / 0 / -0.6 · ignore*: -0.04 / 0 / -0.6 |
| `local-referendum` | hold: 0.28 / 70 / 0.6 · ignore*: -0.32 / 0 / -0.2 |
| `ngo-lawsuit` | settle: -0.06 / 150 / 0.2 · fight: -0.04 / 60 / -0.6 · ignore*: -0.07 / 0 / -1.3 |
| `youth-council` | create: 0.22 / 50 / 0.3 · ignore*: 0.00 / 0 / 0.0 |
| `transport-strike` | fuel: 0.28 / 140 / 0.1 · rail: 0.14 / 180 / 0.2 · ignore*: -0.59 / 0 / -0.3 |
| `community-kitchens` | fund: 0.48 / 130 / 0.3 · local: 0.42 / 150 / 0.2 · ignore*: -0.47 / 0 / -0.3 |
| `just-transition-demand` | fund: 0.45 / 200 / 0.3 · training: 0.13 / 80 / 0.1 · ignore*: -0.39 / 0 / -0.2 |
| `land-registry` | update: 0.02 / 100 / -0.0 · ignore*: 0.00 / 0 / -0.4 |
| `mayor-alliance` | fund: 0.02 / 90 / 0.7 · ignore*: 0.00 / 0 / -0.4 |
| `public-hearing` | binding: 0.22 / 0 / 0.2 · advisory*: -0.13 / 0 / -0.1 |
| `recession` | stimulus: 0.40 / 200 / 0.3 · austerity: -0.43 / -120 / -0.3 · ignore*: -0.14 / 0 / -0.1 |
| `inflation-spike` | transfer: 0.50 / 180 / 0.3 · ignore*: -0.51 / 0 / -0.3 |
| `credit-rating` | plan: 0.07 / 60 / 0.0 · ignore*: -0.14 / 0 / -0.1 |
| `green-bond` | issue: 0.03 / 0 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `carbon-market` | sell: 0.04 / -260 / -0.1 · community: 0.25 / -160 / 0.2 · refuse*: 0.02 / 0 / 0.1 |
| `climate-fund` | apply: 0.11 / -180 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `deforestation-regulation` | traceability: 0.13 / 170 / 0.0 · divert: -0.12 / 0 / -0.2 · ignore*: -0.14 / 0 / -0.1 |
| `tariff-war` | diversify: 0.07 / 90 / 0.0 · ignore*: -0.11 / 0 / -0.1 |
| `fdi-offer` | accept: 0.18 / 60 / 0.1 · negotiate: 0.30 / 0 / 0.2 · refuse*: -0.05 / 0 / 0.1 |
| `plant-closure` | rescue: 0.46 / 220 / 0.3 · coop: 0.32 / 120 / 0.2 · ignore*: -0.53 / 0 / -0.4 |
| `tax-evasion` | enforce: 0.00 / -200 / -0.1 · amnesty: 0.00 / -90 / 0.0 · ignore*: 0.00 / 0 / -0.6 |
| `energy-tariff` | shield: 0.35 / 140 / 0.3 · renewables: -0.02 / 200 / -0.0 · ignore*: -0.40 / 0 / -0.3 |
| `fuel-subsidy-cut` | cut-compensate: -0.08 / -60 / 0.1 · cut: -0.52 / -260 / -0.3 · keep*: -0.05 / 80 / -0.2 |
| `sovereign-fund` | climate-fund: 0.09 / 300 / 0.2 · debt: 0.11 / 300 / 0.0 · keep*: 0.00 / 0 / 0.0 |
| `insurance-scheme` | subsidise: 0.16 / 150 / 0.1 · ignore*: 0.00 / 0 / -0.0 |
| `summit-invite` | attend: 0.08 / 40 / 0.2 · observe: 0.02 / 20 / 0.1 · skip*: -0.02 / 0 / -0.1 |
| `twin-region` | sign: 0.05 / 50 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `certification-scheme` | join: 0.16 / 110 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `ipcc-report` | integrate: 0.12 / 60 / 0.2 · ignore*: -0.02 / 0 / -0.1 |
| `migration-inflow` | settle: 0.31 / 140 / 0.2 · ignore*: -0.26 / 0 / -0.2 |
| `water-treaty` | sign: -0.00 / 0 / 0.4 · negotiate: 0.08 / 60 / -0.4 · ignore*: -0.02 / 0 / -0.6 |
| `tech-transfer` | accept: 0.01 / 0 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
| `ngo-funding` | accept: 0.19 / 50 / 0.2 · ignore*: -0.02 / 0 / -0.1 |
| `land-grab` | block: 0.01 / 0 / -0.1 · condition: 0.11 / -120 / 0.0 · allow*: -0.34 / 0 / -0.2 |
| `debt-swap` | swap: 0.01 / 0 / -0.0 · refuse*: -0.03 / 0 / -0.1 |
| `research-station` | host: 0.09 / 70 / 0.1 · ignore*: 0.00 / 0 / 0.0 |
