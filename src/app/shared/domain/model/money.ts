/**
 * Immutable amount of money in a currency (ISO 4217 code, e.g. PEN, USD).
 * Amounts travel as plain numbers in the API; Money is used to display and calculate in the views.
 */
export class Money {
  readonly #amount: number;
  readonly #currency: string;

  constructor(amount: number, currency = 'PEN') {
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    this.#amount = amount;
    this.#currency = currency;
  }

  get amount(): number {
    return this.#amount;
  }

  get currency(): string {
    return this.#currency;
  }

  /**
   * Formats the amount with two decimals in the given locale, e.g. `S/ 1,234.56` for es-PE.
   * @param locale - BCP 47 locale, `es-PE` by default.
   */
  format(locale = 'es-PE'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.#currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.#amount);
  }
}
