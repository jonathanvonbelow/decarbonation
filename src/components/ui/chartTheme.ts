/**
 * Single source of truth for Recharts styling. No hardcoded colors in chart components.
 * mejora-general/files/11_design_system.md §5. Not consumed by Dashboard.tsx yet — that
 * migration (replacing Recharts' default color array) is phase 10.
 */
export const CHART = {
  grid: { stroke: '#1F332C', strokeDasharray: '2 4' },
  axis: { stroke: '#6E7C76', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' },
  tooltip: {
    contentStyle: {
      backgroundColor: '#0E1A16',
      border: '1px solid #2B4239',
      borderRadius: 6,
      fontSize: 13,
      fontFamily: 'Instrument Sans, system-ui, sans-serif',
    },
    itemStyle: { color: '#E9E7DF' },
    labelStyle: { color: '#A3B0A9', fontFamily: 'IBM Plex Mono, monospace' },
  },
  series: {
    biodiversity: '#6FD08C',
    foodSecurity: '#E0A458',
    economicSecurity: '#8FA0C8',
    socialWellbeing: '#5FB3C9',
    politicalStability: '#C8E6A0',
    emissions: '#E8613C',
    pbi: '#8FA0C8',
    debt: '#E8613C',
  },
  /** Land cover legend — colours quote classification maps, not a decorative palette. */
  landUse: {
    protectedNativeForest: '#2F6B45',
    unprotectedNativeForest: '#4E9A62',
    agroecologicalCrops: '#9BC66B',
    conventionalCrops: '#D9C069',
    forestPlantations: '#3E7F7A',
    grasslandsPastures: '#C39B57',
    degradedLand: '#8A6A52',
    urban: '#7C8B86',
    wetlands: '#5FB3C9',
  },
} as const;
