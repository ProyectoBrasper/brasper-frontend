import { Expense } from '../../../expenses/domain/model/expense.entity';
import { FixedAsset } from '../model/fixed-asset.entity';

/** What the backend will calculate for a new asset. */
export interface FixedAssetPreview {
  igv: number;
  total: number;
  monthlyDepreciation: number;
}

/**
 * Mirrors the backend: IGV = base × rate and monthly depreciation = base ÷ months, both rounded HALF_UP to cents. Works
 * in integer cents to avoid float errors. An empty life previews no depreciation.
 */
export function previewFixedAsset(taxableBase: number, igvRate: number, usefulLifeMonths: number): FixedAssetPreview {
  const baseCents = Math.round(Math.max(0, taxableBase || 0) * 100);
  const igvCents = Math.round((baseCents * Math.round(igvRate * 10000)) / 10000);
  const monthlyCents = usefulLifeMonths > 0 ? Math.round(baseCents / usefulLifeMonths) : 0;
  return { igv: igvCents / 100, total: (baseCents + igvCents) / 100, monthlyDepreciation: monthlyCents / 100 };
}

/**
 * Expenses an asset can come from, latest first: not annulled and not already taken by another asset. The backend does
 * not check either, and linking one twice would take its cost out twice.
 */
export function linkableExpenses(expenses: readonly Expense[], assets: readonly FixedAsset[]): Expense[] {
  const linked = new Set(assets.map((asset) => asset.expenseId));
  return expenses
    .filter((expense) => expense.isActive() && !linked.has(expense.id))
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.id - a.id);
}
