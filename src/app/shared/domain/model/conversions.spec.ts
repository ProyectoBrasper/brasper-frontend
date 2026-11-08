import { fromIsoDate, toIsoDate } from './iso-date';
import { toFraction, toPercent } from './percentage';

describe('iso dates', () => {
  it('formats the local calendar date without shifting to UTC', () => {
    expect(toIsoDate(new Date(2026, 0, 14))).toBe('2026-01-14');
    expect(toIsoDate(new Date(2026, 10, 30, 23, 59))).toBe('2026-11-30');
  });

  it('parses yyyy-MM-dd as a local date', () => {
    const date = fromIsoDate('2026-11-04');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 10, 4]);
  });

  it('rejects malformed or impossible dates', () => {
    expect(fromIsoDate('04/11/2026')).toBeNull();
    expect(fromIsoDate('2026-02-30')).toBeNull();
    expect(fromIsoDate(null)).toBeNull();
  });
});

describe('percentages', () => {
  it('converts fractions to percentages without float noise', () => {
    expect(toPercent(0.025)).toBe(2.5);
    expect(toPercent(0.72)).toBe(72);
    expect(toPercent(0.6)).toBe(60);
  });

  it('converts percentages to fractions with four decimals', () => {
    expect(toFraction(2.5)).toBe(0.025);
    expect(toFraction(100)).toBe(1);
    expect(toFraction(33.333)).toBe(0.3333);
  });
});
