import { CashFlowLine } from '../../../domain/model/cash-flow-report';
import { balanceChartData, CashFlowChartLabels, CHART_COLORS, compactAmount, flowsChartData } from './cash-flow-chart-data';

const line = (startDate: string, endDate: string, totalInflows: number, totalOutflows: number, closingBalance: number) =>
  new CashFlowLine({
    startDate,
    endDate,
    projected: false,
    openingBalance: 0,
    inflows: {},
    outflows: {},
    totalInflows,
    totalOutflows,
    netFlow: totalInflows - totalOutflows,
    closingBalance,
  });

const today = new Date(2026, 10, 10);
const lines = [
  line('2026-11-02', '2026-11-08', 10, 20, 100),
  line('2026-11-09', '2026-11-15', 30, 40, 90),
  line('2026-11-16', '2026-11-22', 50, 60, 80),
];
const labels: CashFlowChartLabels = { inflows: 'In', outflows: 'Out', balance: 'Balance', column: (l) => l.startDate };

describe('flowsChartData', () => {
  it('has one bar per column for inflows and for outflows', () => {
    const data = flowsChartData(lines, labels, today);
    expect(data.labels).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(data.datasets.map((set) => set.data)).toEqual([
      [10, 30, 50],
      [20, 40, 60],
    ]);
  });

  it('keeps what happened solid and lightens the week of today and what is scheduled', () => {
    const [inflows] = flowsChartData(lines, labels, today).datasets;
    expect(inflows.backgroundColor).toEqual([CHART_COLORS.inflow, `${CHART_COLORS.inflow}59`, `${CHART_COLORS.inflow}59`]);
  });
});

describe('balanceChartData', () => {
  it('plots the closing balance of each column', () => {
    expect(balanceChartData(lines, labels, today).datasets[0].data).toEqual([100, 90, 80]);
  });

  it('dashes only the stretches that reach a column not fully real', () => {
    const history = [line('2026-10-05', '2026-10-11', 0, 0, 1), ...lines];
    const { segment } = balanceChartData(history, labels, today).datasets[0];
    const { borderDash: dash } = segment as unknown as { borderDash: (context: { p1DataIndex: number }) => number[] | undefined };
    expect(dash({ p1DataIndex: 1 })).toBeUndefined();
    expect(dash({ p1DataIndex: 2 })).toEqual([6, 4]);
    expect(dash({ p1DataIndex: 3 })).toEqual([6, 4]);
  });
});

describe('compactAmount', () => {
  it('shortens thousands and millions, and leaves the rest', () => {
    expect(compactAmount(850000)).toBe('850K');
    expect(compactAmount(1200000)).toBe('1.2M');
    expect(compactAmount(-50000)).toBe('-50K');
    expect(compactAmount(0)).toBe('0');
  });
});
