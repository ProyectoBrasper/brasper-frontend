import { CashFlowWeek } from './cash-flow-week';
import { Period } from './period';

const range = (week: CashFlowWeek) =>
  `${week.number}:${week.startDate().getDate()}-${week.endDate().getDate()}`;

describe('CashFlowWeek (same rule as the backend)', () => {
  it('November 2026 has 6 weeks: the 1st is a Sunday and week 6 is only the 30th', () => {
    expect(CashFlowWeek.weeksOf(new Period(2026, 11)).map(range)).toEqual([
      '1:1-1',
      '2:2-8',
      '3:9-15',
      '4:16-22',
      '5:23-29',
      '6:30-30',
    ]);
  });

  it('a February starting on Monday has 4 weeks (February 2027)', () => {
    expect(CashFlowWeek.weeksOf(new Period(2027, 2)).map(range)).toEqual(['1:1-7', '2:8-14', '3:15-21', '4:22-28']);
  });

  it('October 2026 has 5 weeks', () => {
    expect(CashFlowWeek.weeksOf(new Period(2026, 10)).map(range)).toEqual([
      '1:1-4',
      '2:5-11',
      '3:12-18',
      '4:19-25',
      '5:26-31',
    ]);
  });

  it('finds the week of a date', () => {
    const week = (y: number, m: number, d: number) => CashFlowWeek.from(new Date(y, m - 1, d)).number;
    expect(week(2026, 11, 1)).toBe(1);
    expect(week(2026, 11, 2)).toBe(2);
    expect(week(2026, 11, 15)).toBe(3);
    expect(week(2026, 11, 16)).toBe(4);
    expect(week(2026, 11, 30)).toBe(6);
    expect(week(2026, 10, 4)).toBe(1);
    expect(week(2026, 10, 31)).toBe(5);
  });

  it('rejects weeks that do not exist in the month', () => {
    expect(() => new CashFlowWeek(2026, 10, 6)).toThrow();
    expect(() => new CashFlowWeek(2026, 11, 7)).toThrow();
    expect(() => new CashFlowWeek(2026, 11, 0)).toThrow();
  });
});
