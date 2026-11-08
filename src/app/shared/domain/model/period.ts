/**
 * Immutable calendar month (accounting / reporting period).
 */
export class Period {
  readonly #year: number;
  readonly #month: number;

  /**
   * @param year - Four-digit year.
   * @param month - Month number, 1 (January) to 12 (December).
   */
  constructor(year: number, month: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`Invalid period: ${year}-${month}`);
    }
    this.#year = year;
    this.#month = month;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  /**
   * Human-readable label with the month capitalized, e.g. `Octubre 2026` (es) or `October 2026` (en).
   * @param locale - BCP 47 locale, `es-PE` by default.
   */
  label(locale = 'es-PE'): string {
    const monthName = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(this.#year, this.#month - 1, 1)),
    );
    return `${monthName.charAt(0).toLocaleUpperCase(locale)}${monthName.slice(1)} ${this.#year}`;
  }

  /** The following month, rolling over to January of the next year. */
  next(): Period {
    return this.#month === 12 ? new Period(this.#year + 1, 1) : new Period(this.#year, this.#month + 1);
  }

  /** The previous month, rolling back to December of the previous year. */
  previous(): Period {
    return this.#month === 1 ? new Period(this.#year - 1, 12) : new Period(this.#year, this.#month - 1);
  }
}
