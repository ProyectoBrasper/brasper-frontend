import { Expense } from '../../../expenses/domain/model/expense.entity';
import { toIsoDate } from '../../../shared/domain/model/iso-date';
import { Period } from '../../../shared/domain/model/period';
import { FixedAsset } from '../model/fixed-asset.entity';
import { EntrySource, JournalEntry } from '../model/journal-entry.entity';

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

const toCents = (amount: number) => Math.round(amount * 100);
const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));

/**
 * Mirrors the backend `accumulatedDepreciationAt`: whole calendar months since the acquisition (the acquisition month
 * does not count), up to the disposal and the useful life. The last month takes the rounding remainder.
 */
function accumulatedCents(asset: FixedAsset, date: string): number {
  const end = asset.disposedOn !== null && asset.disposedOn < date ? asset.disposedOn : date;
  const months = Math.max(0, Math.min(asset.usefulLifeMonths, monthIndex(end) - monthIndex(asset.acquiredOn)));
  const base = toCents(asset.taxableBase);
  return months === asset.usefulLifeMonths ? base : Math.min(base, toCents(asset.monthlyDepreciation) * months);
}

/** The last day of a month (`yyyy-MM-dd`): the date of its depreciation entry. */
export function lastDayOf(period: Period): string {
  return toIsoDate(new Date(period.year, period.month, 0));
}

/** What a month charges and how many assets it covers. */
export interface MonthlyCharge {
  total: number;
  assets: number;
}

/** What the backend will post for a month: per asset, the accumulated at its end minus at the end of the month before. */
export function monthlyCharge(assets: readonly FixedAsset[], period: Period): MonthlyCharge {
  const end = lastDayOf(period);
  const previousEnd = lastDayOf(period.previous());
  const charges = assets.map((asset) => accumulatedCents(asset, end) - accumulatedCents(asset, previousEnd)).filter((cents) => cents > 0);
  return { total: charges.reduce((sum, cents) => sum + cents, 0) / 100, assets: charges.length };
}

/** The month's depreciation entry, if posted. A reversed one still counts: the backend will not post that month again. */
export function depreciationEntry(entries: readonly JournalEntry[]): JournalEntry | undefined {
  return entries.find((entry) => entry.source === EntrySource.DEPRECIATION);
}

/** Whether a month has not started yet (its entry would be dated in the future). */
export function isFutureMonth(period: Period, today: Date = new Date()): boolean {
  return period.year * 12 + period.month > today.getFullYear() * 12 + today.getMonth() + 1;
}

/** Whether today falls in the month (it can still take assets that would miss this charge). */
export function isCurrentMonth(period: Period, today: Date = new Date()): boolean {
  return period.year === today.getFullYear() && period.month === today.getMonth() + 1;
}

/** The entry of a disposal: the accumulated depreciation and the loss (what was left) against the cost. */
export interface DisposalPreview {
  accumulated: number;
  loss: number;
  cost: number;
}

export function previewDisposal(asset: FixedAsset, disposedOn: string): DisposalPreview {
  const cost = toCents(asset.taxableBase);
  const accumulated = accumulatedCents(asset, disposedOn);
  return { accumulated: accumulated / 100, loss: (cost - accumulated) / 100, cost: cost / 100 };
}

/** A disposal in a month before the current one: months already posted after it are not corrected. */
export function isBackdatedDisposal(disposedOn: string, today: Date = new Date()): boolean {
  return monthIndex(disposedOn) < today.getFullYear() * 12 + today.getMonth() + 1;
}
