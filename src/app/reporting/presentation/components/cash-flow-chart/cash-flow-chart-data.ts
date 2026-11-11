import type { ChartConfiguration, ChartData, ScriptableLineSegmentContext } from 'chart.js';
import { Money } from '../../../../shared/domain/model/money';
import { CashFlowLine } from '../../../domain/model/cash-flow-report';
import { lineState } from '../../../domain/services/cash-flow-figures';

/** Chart colors of DESIGN.md. A canvas cannot read CSS tokens, and the app only has a light theme. */
export const CHART_COLORS = {
  inflow: '#1b7f4b',
  outflow: '#ba1a1a',
  balance: '#0b4f8a',
  grid: '#e4e7ec',
  text: '#5f6b7a',
};

/** Alpha (hex) of what is not fully real yet: the same hue, lighter. */
const NOT_REAL_ALPHA = '59';
/** Both panels reserve the same width for their axis, so their columns line up. */
const AXIS_WIDTH = 64;

export interface CashFlowChartLabels {
  inflows: string;
  outflows: string;
  balance: string;
  /** Text of a column on the shared axis; an array breaks it into lines. */
  column: (line: CashFlowLine) => string | string[];
}

/** Whether a column holds anything scheduled: the week of today is a mix, so it counts. */
const notReal = (lines: readonly CashFlowLine[], today: Date) => lines.map((line) => lineState(line, today) !== 'ACTUAL');

const shade = (color: string, flags: readonly boolean[]) => flags.map((flag) => (flag ? `${color}${NOT_REAL_ALPHA}` : color));

/** The inflows and outflows of each column. */
export function flowsChartData(
  lines: readonly CashFlowLine[],
  labels: CashFlowChartLabels,
  today: Date = new Date(),
): ChartData<'bar'> {
  const flags = notReal(lines, today);
  const bar = { maxBarThickness: 24, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' as const };
  return {
    labels: lines.map(labels.column),
    datasets: [
      { ...bar, label: labels.inflows, data: lines.map((line) => line.totalInflows), backgroundColor: shade(CHART_COLORS.inflow, flags) },
      { ...bar, label: labels.outflows, data: lines.map((line) => line.totalOutflows), backgroundColor: shade(CHART_COLORS.outflow, flags) },
    ],
  };
}

/** The closing balance of each column; the stretch that reaches a column not fully real is dashed. */
export function balanceChartData(
  lines: readonly CashFlowLine[],
  labels: CashFlowChartLabels,
  today: Date = new Date(),
): ChartData<'line'> {
  const flags = notReal(lines, today);
  return {
    labels: lines.map(labels.column),
    datasets: [
      {
        label: labels.balance,
        data: lines.map((line) => line.closingBalance),
        borderColor: CHART_COLORS.balance,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointBackgroundColor: shade(CHART_COLORS.balance, flags),
        segment: { borderDash: (context: ScriptableLineSegmentContext) => (flags[context.p1DataIndex] ? [6, 4] : undefined) },
      },
    ],
  };
}

/** `850000` → `850K`, `1200000` → `1.2M`: axis ticks stay short. */
export function compactAmount(amount: number): string {
  const size = Math.abs(amount);
  if (size >= 1_000_000) {
    return `${Number((amount / 1_000_000).toFixed(1))}M`;
  }
  return size >= 1_000 ? `${Number((amount / 1_000).toFixed(0))}K` : String(amount);
}

/** Options shared by both panels; the balance does not have to start at zero, the bars do. */
export function panelOptions(kind: 'flows' | 'balance'): ChartConfiguration['options'] {
  const ticks = { color: CHART_COLORS.text, font: { family: 'Inter, sans-serif', size: 12 } };
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        callbacks: { label: (item) => `${item.dataset.label}: ${new Money(item.parsed.y ?? 0).format()}` },
      },
    },
    scales: {
      x: {
        offset: true,
        grid: { display: false },
        ticks: kind === 'flows' ? { display: false } : { ...ticks, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        beginAtZero: kind === 'flows',
        grid: { color: CHART_COLORS.grid },
        border: { display: false },
        ticks: { ...ticks, maxTicksLimit: 5, callback: (value) => compactAmount(Number(value)) },
        afterFit: (axis) => {
          axis.width = AXIS_WIDTH;
        },
      },
    },
  };
}
