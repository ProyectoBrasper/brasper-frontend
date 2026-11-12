/** Results over a range of months, in PEN (backend `IncomeStatementResource`). Costs and expenses are positive amounts. */
export class IncomeStatement {
  readonly #revenue: number;
  readonly #directCosts: number;
  readonly #grossProfit: number;
  readonly #operatingExpenses: number;
  readonly #operatingProfit: number;
  readonly #financialExpenses: number;
  readonly #profitBeforeTax: number;
  readonly #incomeTax: number;
  readonly #netProfit: number;

  constructor(statement: {
    revenue: number;
    directCosts: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingProfit: number;
    financialExpenses: number;
    profitBeforeTax: number;
    incomeTax: number;
    netProfit: number;
  }) {
    this.#revenue = statement.revenue;
    this.#directCosts = statement.directCosts;
    this.#grossProfit = statement.grossProfit;
    this.#operatingExpenses = statement.operatingExpenses;
    this.#operatingProfit = statement.operatingProfit;
    this.#financialExpenses = statement.financialExpenses;
    this.#profitBeforeTax = statement.profitBeforeTax;
    this.#incomeTax = statement.incomeTax;
    this.#netProfit = statement.netProfit;
  }

  get revenue(): number {
    return this.#revenue;
  }

  get directCosts(): number {
    return this.#directCosts;
  }

  get grossProfit(): number {
    return this.#grossProfit;
  }

  get operatingExpenses(): number {
    return this.#operatingExpenses;
  }

  get operatingProfit(): number {
    return this.#operatingProfit;
  }

  get financialExpenses(): number {
    return this.#financialExpenses;
  }

  get profitBeforeTax(): number {
    return this.#profitBeforeTax;
  }

  get incomeTax(): number {
    return this.#incomeTax;
  }

  get netProfit(): number {
    return this.#netProfit;
  }
}
