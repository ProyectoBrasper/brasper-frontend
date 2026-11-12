import { Period } from './period';

/**
 * "Semana 01..06" of a month, exactly like the backend `CashFlowWeek`: weeks run Monday to Sunday,
 * clipped to the month; week 1 ends on the first Sunday and the last week ends on the last day.
 * Most months have 5 weeks, some 4 (a February starting on Monday) and some 6 (November 2026).
 */
export class CashFlowWeek {
  static readonly MAX_WEEKS = 6;

  readonly #year: number;
  readonly #month: number;
  readonly #number: number;

  constructor(year: number, month: number, number: number) {
    if (!CashFlowWeek.exists(new Period(year, month), number)) {
      throw new Error(`No week ${number} in ${year}-${month}`);
    }
    this.#year = year;
    this.#month = month;
    this.#number = number;
  }

  /** Week that contains a (local) date. */
  static from(date: Date): CashFlowWeek {
    const period = new Period(date.getFullYear(), date.getMonth() + 1);
    const secondWeekStart = addDays(firstSunday(period), 1);
    const day = startOfDay(date);
    const number = day < secondWeekStart ? 1 : 2 + Math.floor(daysBetween(secondWeekStart, day) / 7);
    return new CashFlowWeek(period.year, period.month, number);
  }

  /** All the weeks of a month, in order. */
  static weeksOf(period: Period): CashFlowWeek[] {
    return Array.from({ length: CashFlowWeek.MAX_WEEKS }, (_, i) => i + 1)
      .filter((number) => CashFlowWeek.exists(period, number))
      .map((number) => new CashFlowWeek(period.year, period.month, number));
  }

  static exists(period: Period, number: number): boolean {
    if (!Number.isInteger(number) || number < 1 || number > CashFlowWeek.MAX_WEEKS) {
      return false;
    }
    return number === 1 || startOf(period, number) <= lastDay(period);
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get number(): number {
    return this.#number;
  }

  get period(): Period {
    return new Period(this.#year, this.#month);
  }

  startDate(): Date {
    return this.#number === 1 ? firstDay(this.period) : startOf(this.period, this.#number);
  }

  endDate(): Date {
    const end = this.#number === 1 ? firstSunday(this.period) : addDays(startOf(this.period, this.#number), 6);
    const last = lastDay(this.period);
    return end > last ? last : end;
  }
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Whole days between two local dates (rounded, so a DST change cannot shift it). */
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);
const firstDay = (period: Period) => new Date(period.year, period.month - 1, 1);
const lastDay = (period: Period) => new Date(period.year, period.month, 0);
/** First Sunday on or after the 1st (TemporalAdjusters.nextOrSame(SUNDAY)). */
const firstSunday = (period: Period) => {
  const first = firstDay(period);
  return addDays(first, (7 - first.getDay()) % 7);
};
/** Start of week n (n >= 2): the Monday after the first Sunday, plus whole weeks. */
const startOf = (period: Period, number: number) => addDays(firstSunday(period), 1 + 7 * (number - 2));
