/**
 * Food-security delta of model 1.1 (phase 41 replaces it). Economic security, social conflict and political
 * collapse moved to model 2.0 in phase 39 (src/sim/v2/indicators.ts), biodiversity in phase 40
 * (src/sim/v2/biodiversity.ts).
 * Ported verbatim from src/App.tsx (module-scope pure functions, unchanged since they were
 * already outside the React component) as part of the phase-2 extraction
 * (mejora-general/files/16_auditoria_ecuaciones.md). Model 1.1 (phase 34) adds the pacts' impulses.
 */
import type { ControlParams, Indicators, LandUse, Pact, PactImpulses, PolicyState } from '../types';
import { LandUseType, Policy } from '../types';
import { INDICATOR_IMPACT_WEIGHTS } from '../constants';
import { getPolicyEfficiency } from './policies';

/**
 * Sum of the active pacts' impulses on one indicator (model 1.1, phase 34, N-03/T-03). It enters the
 * indicator function's policy impact before the weighting, like one more policy at efficiency 1.
 */
export function pactImpulse(pacts: Record<string, Pact> | undefined, key: keyof PactImpulses): number {
  if (!pacts) return 0;
  return (Object.values(pacts) as Pact[]).reduce((sum, p) => sum + (p.isActive ? p.impulses?.[key] ?? 0 : 0), 0);
}

export function calculateFoodSecurityChange(
  policies: Record<Policy, PolicyState>,
  landUses: Record<LandUseType, LandUse>,
  indicators: Indicators,
  currentLevel: number,
  CP: ControlParams,
  pacts?: Record<string, Pact>,
): number {
  let policyImpact = pactImpulse(pacts, 'foodSecurity');
  const fsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.POLICIES;
  (Object.keys(policies) as Policy[]).forEach((pKey) => {
    const policy = policies[pKey];
    if ((fsWeights as any)[pKey] && policy) {
      policyImpact += getPolicyEfficiency(policy, currentLevel) * (fsWeights as any)[pKey];
    }
  });
  if (
    getPolicyEfficiency(policies[Policy.SustainableLivestock], currentLevel) > 0 &&
    getPolicyEfficiency(policies[Policy.Agroecological], currentLevel) > 0
  ) {
    policyImpact += fsWeights.Sinergia_GS_AS_SA_Factor;
  }

  let landUseImpact = 0;
  const luFsWeights = INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.LAND_USE;
  const currentTotalLandArea = (Object.values(landUses) as LandUse[]).reduce((sum, lu) => sum + lu.area, 0);
  if (currentTotalLandArea > 0) {
    (Object.values(LandUseType) as LandUseType[]).forEach((luKey) => {
      if ((luFsWeights as any)[luKey]) {
        landUseImpact += (landUses[luKey].area / currentTotalLandArea) * (luFsWeights as any)[luKey];
      }
    });
  }

  const biodiversityEffect = indicators.biodiversity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.BIODIVERSITY_IMPACT_ON_FOOD_SECURITY;
  const economicSecurityEffect = indicators.economicSecurity * INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY.ECONOMIC_SECURITY_IMPACT_ON_FOOD_SECURITY;

  const change =
    policyImpact * CP.Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso +
    landUseImpact * CP.Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso +
    biodiversityEffect * CP.Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso +
    economicSecurityEffect;

  const maxChange = 4;
  const actualChange = Math.max(-maxChange, Math.min(maxChange, change * 0.1));
  return indicators.foodSecurity + actualChange;
}
