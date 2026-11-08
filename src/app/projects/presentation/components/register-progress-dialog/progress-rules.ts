import { ProgressRecord } from '../../../domain/model/progress-record.entity';

/** Same rule as the backend: one progress record per month. */
export function isPeriodTaken(records: readonly ProgressRecord[], year: number, month: number): boolean {
  return records.some((record) => record.year === year && record.month === month);
}

/**
 * Period proposed for a new record: the given month if it is free, otherwise the first free month
 * after the latest record.
 */
export function suggestedPeriod(records: readonly ProgressRecord[], today: Date): { year: number; month: number } {
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  if (!isPeriodTaken(records, year, month)) {
    return { year, month };
  }
  const latest = Math.max(...records.map((record) => record.periodKey));
  year = Math.floor(latest / 100);
  month = latest % 100;
  do {
    month = month === 12 ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
  } while (isPeriodTaken(records, year, month));
  return { year, month };
}
