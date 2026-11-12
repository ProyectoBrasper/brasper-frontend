import { Period } from '../../../shared/domain/model/period';
import { datosPartners } from '../../testing/partner-fixtures';
import { contributionsIn, contributionsTotal } from './partner-figures';

describe('partner figures (the contributions come inside each partner)', () => {
  it('lists the contributions of October 2026: only the expense partner 1 paid out of pocket (mockup #29)', () => {
    const rows = contributionsIn(datosPartners(), new Period(2026, 10));
    expect(rows.map((row) => [row.partner.fullName, row.contribution.amount])).toEqual([['Roberto Salas Lazo', 2400]]);
    expect(contributionsTotal(rows)).toBe(2400);
  });

  it('mixes the partners of a month by date (March 2026: 40,000 on the 1st, 25,000 on the 5th)', () => {
    const rows = contributionsIn(datosPartners(), new Period(2026, 3));
    expect(rows.map((row) => row.contribution.id)).toEqual([1, 4]);
    expect(contributionsTotal(rows)).toBe(65000);
  });

  it('is empty for a month without contributions', () => {
    const rows = contributionsIn(datosPartners(), new Period(2026, 11));
    expect(rows).toEqual([]);
    expect(contributionsTotal(rows)).toBe(0);
  });

  it('does not take another year with the same month', () => {
    expect(contributionsIn(datosPartners(), new Period(2025, 3))).toEqual([]);
  });
});
