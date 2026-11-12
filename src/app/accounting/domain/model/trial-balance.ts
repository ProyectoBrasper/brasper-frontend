const toCents = (amount: number) => Math.round(amount * 100);

/** Debit and credit moved on one account in the month (backend `TrialBalanceResource.Line`). */
export class TrialBalanceLine {
  readonly #accountCode: string;
  readonly #accountName: string;
  readonly #debit: number;
  readonly #credit: number;
  readonly #currency: string;

  constructor(line: { accountCode: string; accountName: string; debit: number; credit: number; currency: string }) {
    this.#accountCode = line.accountCode;
    this.#accountName = line.accountName;
    this.#debit = line.debit;
    this.#credit = line.credit;
    this.#currency = line.currency;
  }

  get accountCode(): string {
    return this.#accountCode;
  }

  get accountName(): string {
    return this.#accountName;
  }

  get debit(): number {
    return this.#debit;
  }

  get credit(): number {
    return this.#credit;
  }

  get currency(): string {
    return this.#currency;
  }

  /** Debit minus credit of the month: below zero, the account moved more on the credit side. */
  balance(): number {
    return (toCents(this.#debit) - toCents(this.#credit)) / 100;
  }
}

/**
 * The trial balance of a month (backend `TrialBalanceResource`): what each account moved in that month, not its
 * balance since the start. Only accounts with movements come, by code; reversed entries and their reversals are in
 * the sums too (they cancel out in the balance). The backend sends no totals: they are added here.
 */
export class TrialBalance {
  readonly #year: number;
  readonly #month: number;
  readonly #lines: TrialBalanceLine[];

  constructor(balance: { year: number; month: number; lines: TrialBalanceLine[] }) {
    this.#year = balance.year;
    this.#month = balance.month;
    this.#lines = balance.lines;
  }

  get year(): number {
    return this.#year;
  }

  get month(): number {
    return this.#month;
  }

  get lines(): TrialBalanceLine[] {
    return this.#lines;
  }

  totalDebit(): number {
    return this.#lines.reduce((sum, line) => sum + toCents(line.debit), 0) / 100;
  }

  totalCredit(): number {
    return this.#lines.reduce((sum, line) => sum + toCents(line.credit), 0) / 100;
  }

  /** Sum of the balances: zero when debit equals credit. */
  totalBalance(): number {
    return (toCents(this.totalDebit()) - toCents(this.totalCredit())) / 100;
  }

  /** Debit equals credit, as every balanced entry makes it. */
  isBalanced(): boolean {
    return this.totalBalance() === 0;
  }

  isEmpty(): boolean {
    return this.#lines.length === 0;
  }
}
