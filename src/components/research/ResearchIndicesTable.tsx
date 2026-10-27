/**
 * v6 / phase 48 (mejora-general/files/48 §5): the session's research indices (src/sim/v2/research.ts) as a small
 * table, shared by the 3-level debriefing (DebriefingModal) and Territorio's closing screen (screens.tsx EndScreen).
 * Texts in the main dictionary (debriefing.research.*); each row carries its explanation as a tooltip and a hint line.
 */
import React from 'react';
import { useT, type TranslationKey } from '../../i18n';
import type { ResearchIndices } from '../../sim';

type Row = { key: string; value: number | null; digits: number; tip?: string };

interface Props {
  indices: ResearchIndices;
  /** Classes of the outer table, its row borders, the label cell, the value cell and the hint line. */
  className?: string;
  rowClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  hintClassName?: string;
}

export const ResearchIndicesTable: React.FC<Props> = ({
  indices, className = 'w-full text-left text-sm', rowClassName = 'border-t border-gray-700', labelClassName = 'py-1.5 text-gray-300',
  valueClassName = 'py-1.5 text-right tabular-nums text-gray-100', hintClassName = 'block text-xs text-gray-400',
}) => {
  const { t, locale } = useT();
  const tr = (k: string) => t(`debriefing.research.${k}` as TranslationKey);
  const fmt = (x: number | null, digits: number) =>
    (x === null ? tr('none') : new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x));
  const rows: Row[] = [
    { key: 'regret', value: indices.regret_mean, digits: 1, tip: 'regretTip' },
    { key: 'gap', value: indices.safe_just_gap, digits: 2, tip: 'gapTip' },
    { key: 'budget', value: indices.carbon_budget_used, digits: 2, tip: 'budgetTip' },
    { key: 'resilience', value: indices.resilience_months, digits: 0, tip: 'resilienceTip' },
    { key: 'concentration', value: indices.land_concentration, digits: 2 },
    { key: 'justTransition', value: indices.just_transition, digits: 2 },
    { key: 'entropy', value: indices.policy_entropy, digits: 2 },
    { key: 'reversals', value: indices.policy_reversals, digits: 0 },
  ];
  return (
    <table className={className} data-testid="research-indices">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className={rowClassName}>
            <td className={labelClassName} title={r.tip ? tr(r.tip) : undefined}>
              {tr(r.key)}
              {r.tip && <span className={hintClassName}>{tr(r.tip)}</span>}
            </td>
            <td className={valueClassName}>{fmt(r.value, r.digits)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ResearchIndicesTable;
