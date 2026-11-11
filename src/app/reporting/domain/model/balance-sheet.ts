const toCents = (amount: number) => Math.round(amount * 100);

/** Amount per account code; equity also carries `RESULT`, the profit not yet closed. */
export type BalanceSheetAmounts = Readonly<Record<string, number>>;

/** The key of the profit not yet closed: the backend has no period closing. */
export const UNCLOSED_RESULT = 'RESULT';

/** Position on a date, in PEN (backend `BalanceSheetResource`), by account code. */
export class BalanceSheet {
  readonly #asOf: string;
  readonly #assets: BalanceSheetAmounts;
  readonly #liabilities: BalanceSheetAmounts;
  readonly #equity: BalanceSheetAmounts;
  readonly #totalAssets: number;
  readonly #totalLiabilities: number;
  readonly #totalEquity: number;
  readonly #difference: number;
  readonly #balanced: boolean;

  constructor(sheet: {
    asOf: string;
    assets: BalanceSheetAmounts;
    liabilities: BalanceSheetAmounts;
    equity: BalanceSheetAmounts;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    difference: number;
    balanced: boolean;
  }) {
    this.#asOf = sheet.asOf;
    this.#assets = sheet.assets;
    this.#liabilities = sheet.liabilities;
    this.#equity = sheet.equity;
    this.#totalAssets = sheet.totalAssets;
    this.#totalLiabilities = sheet.totalLiabilities;
    this.#totalEquity = sheet.totalEquity;
    this.#difference = sheet.difference;
    this.#balanced = sheet.balanced;
  }

  /** `yyyy-MM-dd`. */
  get asOf(): string {
    return this.#asOf;
  }

  get assets(): BalanceSheetAmounts {
    return this.#assets;
  }

  get liabilities(): BalanceSheetAmounts {
    return this.#liabilities;
  }

  get equity(): BalanceSheetAmounts {
    return this.#equity;
  }

  get totalAssets(): number {
    return this.#totalAssets;
  }

  get totalLiabilities(): number {
    return this.#totalLiabilities;
  }

  get totalEquity(): number {
    return this.#totalEquity;
  }

  /** Assets minus liabilities and equity: zero when it balances. */
  get difference(): number {
    return this.#difference;
  }

  get balanced(): boolean {
    return this.#balanced;
  }

  /** What the assets must match. */
  totalLiabilitiesAndEquity(): number {
    return (toCents(this.#totalLiabilities) + toCents(this.#totalEquity)) / 100;
  }
}
