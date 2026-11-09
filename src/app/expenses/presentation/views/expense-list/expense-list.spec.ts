import { sumAmounts } from './expense-list';

describe('sumAmounts', () => {
  it('adds in cents so decimals do not drift', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });

  it('adds the October active expenses of DATOS.md (S/ 254,150.00)', () => {
    expect(sumAmounts([141600, 70800, 8000, 1850, 29500, 2400])).toBe(254150);
  });

  it('is 0 without expenses', () => {
    expect(sumAmounts([])).toBe(0);
  });
});
