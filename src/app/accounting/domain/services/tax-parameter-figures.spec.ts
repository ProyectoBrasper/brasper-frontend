import { TaxParameters } from '../model/tax-parameters.entity';
import { dateInUse, firstOfNextMonth, inForceOn } from './tax-parameter-figures';

const rates = (id: number, effectiveFrom: string, igv = 0.18) =>
  new TaxParameters({ id, effectiveFrom, igv, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 });

describe('tax parameter figures', () => {
  const history = [rates(3, '2027-01-01', 0.19), rates(1, '2026-01-01'), rates(2, '2026-07-01', 0.17)];

  it('takes the latest rates whose effective date is on or before the day', () => {
    expect(inForceOn(history, '2026-11-10')?.id).toBe(2);
    expect(inForceOn(history, '2026-07-01')?.id).toBe(2);
    expect(inForceOn(history, '2026-06-30')?.id).toBe(1);
    expect(inForceOn(history, '2027-03-01')?.id).toBe(3);
  });

  it('finds none before the first effective date', () => {
    expect(inForceOn(history, '2025-12-31')).toBeUndefined();
    expect(inForceOn([], '2026-11-10')).toBeUndefined();
  });

  it('proposes the first day of the next month, across the year', () => {
    expect(firstOfNextMonth(new Date(2026, 10, 10))).toEqual(new Date(2026, 11, 1));
    expect(firstOfNextMonth(new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 1));
  });

  it('tells an effective date already used', () => {
    expect(dateInUse(history, new Date(2026, 6, 1))).toBe(true);
    expect(dateInUse(history, new Date(2026, 6, 2))).toBe(false);
  });
});
