/**
 * Map overlays ("ver sobre el mapa"). Each value comes straight from the model's own coefficients
 * for that land use — nothing is invented for the picture:
 *   carbon       sequestration − emission rate of the use (GameState.landUses, per kHa)
 *   biodiversity INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE
 *   food         INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE
 *   economy      INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.LAND_USE
 * Normalised to [-1, 1] across the six uses, positive = favourable for that indicator.
 */
import { INDICATOR_IMPACT_WEIGHTS } from '../constants';
import { LAND_USE_TYPES, type ParcelKind } from '../sim';
import type { LandUse } from '../types';
import { LandUseType } from '../types';

export type HeatMode = 'none' | 'carbon' | 'biodiversity' | 'food' | 'economy';
export const HEAT_MODES: HeatMode[] = ['none', 'carbon', 'biodiversity', 'food', 'economy'];

const LAND_USES = LAND_USE_TYPES;

export function rawCoefficient(mode: Exclude<HeatMode, 'none'>, lu: LandUseType, landUses: Record<LandUseType, LandUse>): number {
  switch (mode) {
    case 'carbon':
      return landUses[lu].sequestrationRate - landUses[lu].emissionRate;
    case 'biodiversity':
      return (INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE as Record<string, number>)[lu] ?? 0;
    case 'food':
      return (INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE as Record<string, number>)[lu] ?? 0;
    case 'economy':
      return (INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY.LAND_USE as Record<string, number>)[lu] ?? 0;
  }
}

/** Normalised overlay value for a parcel, or null for parcels outside the model (river, town…). */
export function heatValue(mode: HeatMode, kind: ParcelKind, landUses: Record<LandUseType, LandUse>): number | null {
  if (mode === 'none') return null;
  // Fallow parcels are the model's fallow land (FAL, phase 37).
  const lu = kind === 'fallow' ? LandUseType.Fallow : kind;
  if (!LAND_USES.includes(lu as LandUseType) || !landUses[lu as LandUseType]) return null;
  const max = Math.max(...LAND_USES.filter((k) => landUses[k]).map((k) => Math.abs(rawCoefficient(mode, k, landUses)))) || 1;
  return rawCoefficient(mode, lu as LandUseType, landUses) / max;
}
