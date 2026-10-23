/**
 * Map overlays ("ver sobre el mapa"). Each value comes straight from the model's own coefficients
 * for that land use — nothing is invented for the picture:
 *   carbon       −flux of the use (PARAMS_V2.flux, tCO2e/ha/yr; phase 38): positive = sink
 *   biodiversity INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE
 *   food         INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE
 *   economy      productive value of the use minus the territory's mean V (PARAMS_V2.productiveValue; V/V0 drives
 *                economic security since phase 39): a use below the mean lowers E* when it grows
 * Normalised to [-1, 1] across the uses, positive = favourable for that indicator.
 */
import { INDICATOR_IMPACT_WEIGHTS } from '../constants';
import { LAND_USE_TYPES, type ParcelKind } from '../sim';
import { PARAMS_V2, type LandCode } from '../sim/v2/params';
import { productiveValue } from '../sim/v2/indicators';
import type { LandUse } from '../types';
import { LandUseType } from '../types';

export type HeatMode = 'none' | 'carbon' | 'biodiversity' | 'food' | 'economy';
export const HEAT_MODES: HeatMode[] = ['none', 'carbon', 'biodiversity', 'food', 'economy'];

const LAND_USES = LAND_USE_TYPES;

export function rawCoefficient(mode: Exclude<HeatMode, 'none'>, lu: LandUseType, landUses: Record<LandUseType, LandUse>): number {
  switch (mode) {
    case 'carbon':
      return -(PARAMS_V2.flux[lu as LandCode] ?? 0);
    case 'biodiversity':
      return (INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY.LAND_USE as Record<string, number>)[lu] ?? 0;
    case 'food':
      return (INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE as Record<string, number>)[lu] ?? 0;
    case 'economy':
      return ((PARAMS_V2.productiveValue as Partial<Record<string, number>>)[lu] ?? 0) - productiveValue(landUses);
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
