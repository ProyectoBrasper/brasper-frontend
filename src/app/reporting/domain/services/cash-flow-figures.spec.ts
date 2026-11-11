import { Period } from '../../../shared/domain/model/period';
import { CASH_FLOW_OUTFLOWS, CashFlowAmounts, CashFlowLine } from '../model/cash-flow-report';
import { clampMonthRange, conceptsWithMovement, lineDates, lineState, monthTitle, weekNumber } from './cash-flow-figures';

const line = (startDate: string, endDate: string, outflows: CashFlowAmounts = {}) =>
  new CashFlowLine({
    startDate,
    endDate,
    projected: false,
    openingBalance: 0,
    inflows: {},
    outflows,
    totalInflows: 0,
    totalOutflows: 0,
    netFlow: 0,
    closingBalance: 0,
  });

describe('lineState', () => {
  const today = new Date(2026, 10, 10);

  it('is actual for a week that already ended', () => {
    expect(lineState(line('2026-11-02', '2026-11-08'), today)).toBe('ACTUAL');
  });

  it('is current for the week of today, on its first and last day too', () => {
    expect(lineState(line('2026-11-09', '2026-11-15'), today)).toBe('CURRENT');
    expect(lineState(line('2026-11-10', '2026-11-15'), today)).toBe('CURRENT');
    expect(lineState(line('2026-11-09', '2026-11-10'), today)).toBe('CURRENT');
  });

  it('is projected for a week that has not started', () => {
    expect(lineState(line('2026-11-16', '2026-11-22'), today)).toBe('PROJECTED');
  });
});

describe('how a week is named', () => {
  it('numbers the weeks like the backend: November 2026 has 6', () => {
    expect(weekNumber(line('2026-11-01', '2026-11-01'))).toBe(1);
    expect(weekNumber(line('2026-11-09', '2026-11-15'))).toBe(3);
    expect(weekNumber(line('2026-11-30', '2026-11-30'))).toBe(6);
  });

  it('shows the days of the week, or a single day', () => {
    expect(lineDates(line('2026-11-09', '2026-11-15'))).toBe('09–15/11');
    expect(lineDates(line('2026-11-30', '2026-11-30'))).toBe('30/11');
  });
});

describe('conceptsWithMovement', () => {
  it('keeps the order of the Excel and leaves out concepts without movement', () => {
    const lines = [line('2026-11-02', '2026-11-08', { TAXES: 100 }), line('2026-11-09', '2026-11-15', { SUPPLIERS: 50, CLEANING: 0 })];
    expect(conceptsWithMovement(CASH_FLOW_OUTFLOWS, lines, (l) => l.outflows)).toEqual(['SUPPLIERS', 'TAXES']);
  });
});

describe('monthTitle', () => {
  it('names the month of the line', () => {
    expect(monthTitle(line('2026-11-01', '2026-11-30'))).toBe('Noviembre 2026');
  });
});

describe('clampMonthRange (backend: from not after to, at most 24 months)', () => {
  const months = (range: { from: Period; to: Period }) => [range.from.year, range.from.month, range.to.year, range.to.month];

  it('keeps a valid range, 24 months included', () => {
    expect(months(clampMonthRange(new Period(2026, 1), new Period(2027, 12), 'from'))).toEqual([2026, 1, 2027, 12]);
  });

  it('moves the end along when the start passes it', () => {
    expect(months(clampMonthRange(new Period(2027, 2), new Period(2027, 1), 'from'))).toEqual([2027, 2, 2027, 2]);
  });

  it('moves the start along when the end goes before it', () => {
    expect(months(clampMonthRange(new Period(2026, 6), new Period(2026, 5), 'to'))).toEqual([2026, 5, 2026, 5]);
  });

  it('allows any span without a maximum, but the ends still cannot cross', () => {
    const unlimited = Number.POSITIVE_INFINITY;
    expect(months(clampMonthRange(new Period(2020, 1), new Period(2027, 12), 'from', unlimited))).toEqual([2020, 1, 2027, 12]);
    expect(months(clampMonthRange(new Period(2027, 2), new Period(2027, 1), 'from', unlimited))).toEqual([2027, 2, 2027, 2]);
  });

  it('shortens the other end when the range would span more than 24 months', () => {
    expect(months(clampMonthRange(new Period(2025, 12), new Period(2027, 12), 'from'))).toEqual([2025, 12, 2027, 11]);
    expect(months(clampMonthRange(new Period(2026, 1), new Period(2028, 1), 'to'))).toEqual([2026, 2, 2028, 1]);
  });
});
