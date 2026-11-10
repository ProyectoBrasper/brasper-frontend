import { Period } from '../../../shared/domain/model/period';
import { TaxReturn } from '../model/tax-return.entity';

const samePeriod = (taxReturn: TaxReturn, period: Period) =>
  taxReturn.year === period.year && taxReturn.month === period.month;

/** The return of a month, if it was prepared (there is at most one per month: the backend answers 409 otherwise). */
export function returnFor(returns: readonly TaxReturn[], period: Period): TaxReturn | undefined {
  return returns.find((taxReturn) => samePeriod(taxReturn, period));
}

/** The return of the month before, whose credit this month carries (0 when it was not prepared). */
export function previousReturn(returns: readonly TaxReturn[], period: Period): TaxReturn | undefined {
  return returnFor(returns, period.previous());
}
