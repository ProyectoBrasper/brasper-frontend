import { CASH_FLOW_OUTFLOWS, CashFlowAmounts, CashFlowLine } from '../model/cash-flow-report';
import { conceptsWithMovement, lineDates, lineState, weekNumber } from './cash-flow-figures';

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
