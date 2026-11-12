import { toIsoDate } from '../../../shared/domain/model/iso-date';
import { TaxParameters } from '../model/tax-parameters.entity';

/**
 * The rates in force on a date (`yyyy-MM-dd`): the latest whose effective date is on or before it, like the backend
 * `findFirstByEffectiveFromLessThanEqualOrderByEffectiveFromDesc`. Undefined when none applies yet.
 */
export function inForceOn(history: readonly TaxParameters[], date: string): TaxParameters | undefined {
  return [...history]
    .filter((parameters) => parameters.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

/** The first day of the month after `date`: the usual start of new rates. */
export function firstOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** An effective date already used by a row (the backend answers 409). */
export function dateInUse(history: readonly TaxParameters[], date: Date): boolean {
  const iso = toIsoDate(date);
  return history.some((parameters) => parameters.effectiveFrom === iso);
}
