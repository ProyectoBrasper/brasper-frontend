import { CashFlowWeek } from '../../../shared/domain/model/cash-flow-week';
import { fromIsoDate, toIsoDate } from '../../../shared/domain/model/iso-date';
import { CashFlowAmounts, CashFlowLine } from '../model/cash-flow-report';

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
