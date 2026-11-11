import { CashFlowWeek } from '../../../shared/domain/model/cash-flow-week';
import { fromIsoDate, toIsoDate } from '../../../shared/domain/model/iso-date';
import { Period } from '../../../shared/domain/model/period';
import { CashFlowAmounts, CashFlowLine } from '../model/cash-flow-report';

/** What each line of a report covers. */
export type CashFlowGranularity = 'week' | 'month';

/** What a line holds: what happened, a mix (the week of today), or what is scheduled. */
export type CashFlowLineState = 'ACTUAL' | 'CURRENT' | 'PROJECTED';

/**
 * The backend only says `projected`, which is also true for the week of today although part of it already happened,
 * so the state comes from the dates.
 */
export function lineState(line: CashFlowLine, today: Date = new Date()): CashFlowLineState {
  const date = toIsoDate(today);
  if (line.endDate < date) {
    return 'ACTUAL';
  }
  return line.startDate <= date ? 'CURRENT' : 'PROJECTED';
}

/** Number of the week within its month. The backend label comes in English, so the screen builds its own. */
export function weekNumber(line: CashFlowLine): number {
  return CashFlowWeek.from(fromIsoDate(line.startDate)!).number;
}

const dayAndMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** The days of a line: `09–15/11`, or `30/11` when it is a single day. */
export function lineDates(line: CashFlowLine): string {
  return line.startDate === line.endDate
    ? dayAndMonth(line.startDate)
    : `${line.startDate.slice(8, 10)}–${dayAndMonth(line.endDate)}`;
}

/** The concepts of `order` with movement in any line, so a row is never empty across the whole range. */
export function conceptsWithMovement(
  order: readonly string[],
  lines: readonly CashFlowLine[],
  amounts: (line: CashFlowLine) => CashFlowAmounts,
): string[] {
  return order.filter((concept) => lines.some((line) => (amounts(line)[concept] ?? 0) !== 0));
}

/** The month of a monthly line, as the selector names it: `Noviembre 2026`. */
export function monthTitle(line: CashFlowLine, locale = 'es-PE'): string {
  return new Period(Number(line.startDate.slice(0, 4)), Number(line.startDate.slice(5, 7))).label(locale);
}

/** The backend accepts at most this many months. */
export const MAX_CASH_FLOW_MONTHS = 24;

const monthIndex = (period: Period) => period.year * 12 + period.month - 1;
const periodAt = (index: number) => new Period(Math.floor(index / 12), (index % 12) + 1);

/**
 * Keeps a range valid after moving one end (the backend answers 400 otherwise): the other end follows when they would
 * cross or span more than the maximum.
 */
export function clampMonthRange(
  from: Period,
  to: Period,
  moved: 'from' | 'to',
  maxMonths: number = MAX_CASH_FLOW_MONTHS,
): { from: Period; to: Period } {
  const span = monthIndex(to) - monthIndex(from);
  if (span >= 0 && span < maxMonths) {
    return { from, to };
  }
  if (moved === 'from') {
    return { from, to: span < 0 ? from : periodAt(monthIndex(from) + maxMonths - 1) };
  }
  return { from: span < 0 ? to : periodAt(monthIndex(to) - maxMonths + 1), to };
}
