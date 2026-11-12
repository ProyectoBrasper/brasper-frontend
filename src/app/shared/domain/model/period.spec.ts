import { Period } from './period';

describe('Period', () => {
  it('labels the month capitalized in Spanish', () => {
    expect(new Period(2026, 10).label('es-PE')).toBe('Octubre 2026');
  });

  it('labels the month in English', () => {
    expect(new Period(2026, 10).label('en-US')).toBe('October 2026');
  });

  it('moves to the next month and rolls over the year', () => {
    const next = new Period(2026, 12).next();
    expect([next.year, next.month]).toEqual([2027, 1]);
  });

  it('moves to the previous month and rolls back the year', () => {
    const previous = new Period(2026, 1).previous();
    expect([previous.year, previous.month]).toEqual([2025, 12]);
  });

  it('rejects an invalid month', () => {
    expect(() => new Period(2026, 13)).toThrow();
    expect(() => new Period(2026, 0)).toThrow();
  });
});
